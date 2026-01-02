// ==========================================================
// ⚠️ CONFIGURE AQUI SUAS CHAVES DO SUPABASE
// ==========================================================
const SUPABASE_URL = 'COLE_SUA_URL_DO_SUPABASE_AQUI';
const SUPABASE_KEY = 'COLE_SUA_CHAVE_ANON_PUBLIC_AQUI';
// ==========================================================

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const CONFIG = { loanDays: 7 };

// Variáveis Globais para Cache (melhora performance na busca)
let globalStudents = [];
let globalBooks = [];
let globalLoans = [];

// --- NOTIFICAÇÕES ---
const Toast = {
    show: (message, type = 'success') => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerText = message;
        toast.style.borderColor = type === 'error' ? '#ef4444' : '#10b981';
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

// --- DB STORE (COMUNICAÇÃO ONLINE) ---
class Store {
    static async fetchData() {
        // Busca tudo de uma vez para carregar a tela
        const { data: students } = await supabase.from('students').select('*').order('created_at', { ascending: false });
        const { data: books } = await supabase.from('books').select('*').order('created_at', { ascending: false });
        const { data: loans } = await supabase.from('loans').select('*').order('created_at', { ascending: false });

        globalStudents = students || [];
        globalBooks = books || [];
        globalLoans = loans || [];
        return { students: globalStudents, books: globalBooks, loans: globalLoans };
    }

    static async addStudent(student) {
        const { error } = await supabase.from('students').insert([student]);
        if(error) throw error;
    }

    static async deleteStudent(ra) {
        const { error } = await supabase.from('students').delete().eq('ra', ra);
        if(error) throw error;
    }

    static async addBook(book) {
        const { error } = await supabase.from('books').insert([book]);
        if(error) throw error;
    }

    static async deleteBook(bookId) {
        const { error } = await supabase.from('books').delete().eq('book_id', bookId);
        if(error) throw error;
    }

    static async createLoan(loanData) {
        // 1. Cria o registro do empréstimo
        const { error: errLoan } = await supabase.from('loans').insert([loanData]);
        if(errLoan) throw errLoan;

        // 2. Marca o livro como indisponível
        const { error: errBook } = await supabase.from('books').update({ is_available: false }).eq('book_id', loanData.book_id);
        if(errBook) console.error("Erro ao atualizar status do livro", errBook);
    }

    static async returnLoan(loanId, bookId) {
        // 1. Fecha o empréstimo
        const { error: errLoan } = await supabase.from('loans').update({ 
            is_active: false, 
            date_returned: new Date().toISOString() 
        }).eq('loan_id', loanId);
        if(errLoan) throw errLoan;

        // 2. Libera o livro
        const { error: errBook } = await supabase.from('books').update({ is_available: true }).eq('book_id', bookId);
        if(errBook) console.error("Erro ao liberar livro", errBook);
    }
}

// --- IMPRESSÃO ---
const Printer = {
    printContent: (html) => {
        const overlay = document.getElementById('print-overlay');
        overlay.innerHTML = html;
        document.body.classList.add('print-mode-ticket');
        setTimeout(() => {
            window.print();
            setTimeout(() => {
                document.body.classList.remove('print-mode-ticket');
                overlay.innerHTML = '';
            }, 500);
        }, 500);
    },
    label: (b) => {
        Printer.printContent(`
            <div class="print-label">
                <div><h2>LibAuto</h2><p>ID: ${b.book_id}</p><p>${b.title}</p></div>
                <div><img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${b.book_id}" width="90"></div>
            </div>`);
    },
    receipt: (l, type) => {
        const title = type === 'out' ? 'EMPRÉSTIMO' : 'DEVOLUÇÃO';
        const date = new Date().toLocaleString('pt-BR');
        Printer.printContent(`
            <div class="print-ticket">
                <div style="border-bottom:1px dashed #000; padding-bottom:10px;"><h2>${title}</h2><p>${date}</p></div>
                <div style="text-align:left; margin:10px 0;">
                    <p>ALUNO: ${l.student_name}</p>
                    <p>LIVRO: ${l.book_title}</p>
                    <p>ID: ${l.book_id}</p>
                </div>
                <p>Obrigado!</p>
            </div>`);
    }
};

// --- INTERFACE (UI) ---
const UI = {
    init: async () => {
        await UI.render();
    },

    render: async () => {
        try {
            // Carrega dados da nuvem
            await Store.fetchData();
            
            // Atualiza KPI
            document.getElementById('kpi-total-books').innerText = globalBooks.length;
            document.getElementById('kpi-total-students').innerText = globalStudents.length;
            document.getElementById('kpi-borrowed').innerText = globalBooks.filter(b => !b.is_available).length;

            // Renderiza Tabelas
            UI.renderStudents(globalStudents);
            UI.renderBooks(globalBooks);
            UI.renderLoans(globalLoans);
            UI.displayReports(); // Atualiza relatório

        } catch (error) {
            console.error(error);
            Toast.show('Erro de conexão com o banco!', 'error');
        }
    },

    renderStudents: (list) => {
        const el = document.getElementById('student-list');
        el.innerHTML = list.map(s => `
            <tr>
                <td>${s.ra}</td>
                <td><strong>${s.name}</strong></td>
                <td>${s.course} - ${s.turma}</td>
                <td class="no-print"><button class="btn btn-sm btn-danger" onclick="Actions.deleteStudent('${s.ra}')"><i class="fas fa-trash"></i></button></td>
            </tr>`).join('');
    },

    renderBooks: (list) => {
        const el = document.getElementById('book-list');
        el.innerHTML = list.map(b => {
            const status = b.is_available ? '<span class="badge badge-success">Disponível</span>' : '<span class="badge badge-warning">Emprestado</span>';
            return `
            <tr>
                <td>${b.book_id}</td>
                <td><strong>${b.title}</strong></td>
                <td>${b.author}</td>
                <td>${status}</td>
                <td class="no-print"><button class="btn btn-sm btn-danger" onclick="Actions.deleteBook('${b.book_id}')"><i class="fas fa-trash"></i></button></td>
            </tr>`;
        }).join('');
    },

    renderLoans: (list) => {
        const active = list.filter(l => l.is_active);
        const el = document.getElementById('active-loan-list');
        el.innerHTML = active.map(l => {
            const isLate = new Date() > new Date(l.due_date);
            return `
            <tr>
                <td>${l.book_title} (${l.book_id})</td>
                <td>${l.student_name}</td>
                <td style="${isLate?'color:red;font-weight:bold':''}">${new Date(l.due_date).toLocaleDateString()}</td>
                <td class="no-print"><button class="btn btn-sm btn-primary" onclick="Actions.returnBook('${l.loan_id}', '${l.book_id}')">Devolver</button></td>
            </tr>`;
        }).join('');
    },

    displayReports: () => {
        const filter = document.getElementById('report-search').value.toLowerCase();
        const el = document.getElementById('report-list');
        const filtered = globalLoans.filter(l => 
            (l.student_name || '').toLowerCase().includes(filter) || 
            (l.book_title || '').toLowerCase().includes(filter)
        );
        
        el.innerHTML = filtered.map(l => `
            <tr>
                <td>${new Date(l.date_loaned).toLocaleDateString()}</td>
                <td>${l.book_title}</td>
                <td>${l.student_name}</td>
                <td>${l.student_info}</td>
                <td>${l.is_active ? 'ABERTO' : 'DEVOLVIDO'}</td>
            </tr>
        `).join('');
    },

    // Filtro local rápido para livros
    filterBooksLocal: (val) => {
        const filtered = globalBooks.filter(b => b.title.toLowerCase().includes(val.toLowerCase()) || b.book_id.includes(val));
        UI.renderBooks(filtered);
    }
};

// --- AÇÕES DO USUÁRIO ---
const Actions = {
    deleteStudent: async (ra) => {
        if(!confirm('Remover este aluno?')) return;
        try {
            await Store.deleteStudent(ra);
            Toast.show('Aluno removido!');
            UI.render();
        } catch(e) { Toast.show('Erro ao apagar (pode ter empréstimos)', 'error'); }
    },
    
    deleteBook: async (id) => {
        if(!confirm('Remover este livro?')) return;
        try {
            await Store.deleteBook(id);
            Toast.show('Livro removido!');
            UI.render();
        } catch(e) { Toast.show('Erro: Livro pode estar emprestado', 'error'); }
    },

    returnBook: async (loanId, bookId) => {
        if(!confirm('Confirmar devolução?')) return;
        try {
            await Store.returnLoan(loanId, bookId);
            const loan = globalLoans.find(l => l.loan_id === loanId);
            if(loan) Printer.receipt(loan, 'in');
            Toast.show('Devolvido com sucesso!');
            UI.render();
        } catch(e) { Toast.show('Erro na devolução', 'error'); }
    }
};

// --- MODAL & NAVEGAÇÃO ---
const Modal = {
    type: null,
    open: (t) => {
        Modal.type = t;
        document.getElementById('universal-modal').style.display = 'flex';
        document.getElementById('modal-search-input').focus();
        Modal.search('');
    },
    close: () => document.getElementById('universal-modal').style.display = 'none',
    search: (val) => {
        const list = document.getElementById('modal-results-list');
        const q = val.toLowerCase();
        let html = '';

        if(Modal.type === 'student') {
            const res = globalStudents.filter(s => s.name.toLowerCase().includes(q) || s.ra.includes(q));
            html = res.map(s => `
                <li onclick="Modal.selectStudent('${s.ra}', '${s.name}')">
                    <div><strong>${s.name}</strong><br><small>${s.course}</small></div>
                    <div class="badge badge-success">${s.ra}</div>
                </li>`).join('');
        } else {
            const res = globalBooks.filter(b => b.title.toLowerCase().includes(q) || b.book_id.includes(q));
            html = res.map(b => `
                <li onclick="Modal.selectBook('${b.book_id}', '${b.title}', ${b.is_available})" style="opacity:${b.is_available?1:0.5}">
                    <div><strong>${b.title}</strong><br><small>${b.book_id}</small></div>
                    ${b.is_available ? '<div class="badge badge-success">Disp</div>' : '<div class="badge badge-warning">Emp</div>'}
                </li>`).join('');
        }
        list.innerHTML = html || '<li style="padding:10px">Nada encontrado</li>';
    },
    selectStudent: (ra, name) => {
        document.getElementById('loan-student-display').value = name;
        document.getElementById('loan-student-ra-hidden').value = ra;
        Modal.close();
    },
    selectBook: (id, title, avail) => {
        if(!avail) return Toast.show('Livro já emprestado!', 'error');
        document.getElementById('loan-book-display').value = title;
        document.getElementById('loan-book-id-hidden').value = id;
        Modal.close();
    }
};

const Router = {
    navigate: (id) => {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
        document.getElementById(id).classList.add('active-section');
        UI.render(); // Recarrega dados ao trocar de aba
    }
};

// --- EVENTOS ---
document.addEventListener('DOMContentLoaded', UI.init);
document.getElementById('modal-search-input').addEventListener('keyup', (e) => Modal.search(e.target.value));
window.onclick = (e) => e.target == document.getElementById('universal-modal') && Modal.close();

// CADASTRO ALUNO
document.getElementById('student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ra = Math.floor(Math.random() * 900000 + 100000).toString();
    try {
        await Store.addStudent({
            ra: ra,
            name: document.getElementById('student-name').value,
            course: document.getElementById('student-course').value,
            turma: document.getElementById('student-class').value
        });
        Toast.show('Aluno salvo na nuvem!');
        e.target.reset(); UI.render();
    } catch(err) { Toast.show('Erro ao salvar aluno', 'error'); }
});

// CADASTRO LIVRO
document.getElementById('book-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = Math.floor(Math.random() * 90000 + 10000).toString();
    const title = document.getElementById('book-title').value;
    const author = document.getElementById('book-author').value;
    try {
        await Store.addBook({ book_id: id, title, author, is_available: true });
        Toast.show('Livro salvo!');
        if(confirm('Imprimir etiqueta?')) Printer.label({ book_id: id, title, author });
        e.target.reset(); UI.render();
    } catch(err) { Toast.show('Erro ao salvar livro', 'error'); }
});

// NOVO EMPRÉSTIMO
document.getElementById('loan-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bid = document.getElementById('loan-book-id-hidden').value;
    const sra = document.getElementById('loan-student-ra-hidden').value;
    
    if(!bid || !sra) return Toast.show('Selecione Aluno e Livro', 'error');

    const book = globalBooks.find(b => b.book_id === bid);
    const student = globalStudents.find(s => s.ra === sra);
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + CONFIG.loanDays);

    const loanData = {
        loan_id: Date.now().toString(),
        book_id: bid,
        book_title: book.title,
        student_ra: sra,
        student_name: student.name,
        student_info: `${student.course} - ${student.turma}`,
        due_date: dueDate.toISOString(),
        is_active: true
    };

    try {
        await Store.createLoan(loanData);
        Toast.show('Empréstimo Realizado!');
        Printer.receipt(loanData, 'out');
        e.target.reset();
        document.getElementById('loan-book-id-hidden').value = '';
        document.getElementById('loan-student-ra-hidden').value = '';
        UI.render();
    } catch(err) { Toast.show('Erro no empréstimo', 'error'); console.log(err); }
});