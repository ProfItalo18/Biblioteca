// --- IMPORTAÇÕES DO FIREBASE (CDN) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, 
    deleteDoc, doc, updateDoc, query, where 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- SUA CONFIGURAÇÃO (Extraída da imagem) ---
const firebaseConfig = {
    apiKey: "AIzaSyBL35Zvn5_rstsiBBSRnrjP4yovIhyQLgg",
    authDomain: "labbibli.firebaseapp.com",
    projectId: "labbibli",
    storageBucket: "labbibli.firebasestorage.app",
    messagingSenderId: "622286983028",
    appId: "1:622286983028:web:0ac31903992bf82be8e621"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- CONFIGURAÇÕES DO SISTEMA ---
const CONFIG = { loanDays: 7 };

// --- DB HELPER (Conexão com o Banco de Dados) ---
const DB = {
    // Busca todos os documentos de uma coleção
    getAll: async (collectionName) => {
        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            let data = [];
            querySnapshot.forEach((doc) => {
                // Junta o ID interno do Firebase com os dados do documento
                data.push({ firestoreId: doc.id, ...doc.data() });
            });
            return data;
        } catch (error) {
            console.error("Erro ao ler dados:", error);
            Toast.show("Erro de conexão com o Banco de Dados", "error");
            return [];
        }
    },
    // Adiciona documento
    add: async (collectionName, data) => {
        const docRef = await addDoc(collection(db, collectionName), data);
        return docRef.id;
    },
    // Deleta documento
    delete: async (collectionName, firestoreId) => {
        await deleteDoc(doc(db, collectionName, firestoreId));
    },
    // Atualiza documento
    update: async (collectionName, firestoreId, data) => {
        const ref = doc(db, collectionName, firestoreId);
        await updateDoc(ref, data);
    },
    // Busca item específico (ex: achar aluno pelo RA)
    findItem: async (collectionName, field, value) => {
        const q = query(collection(db, collectionName), where(field, "==", value));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docData = querySnapshot.docs[0];
            return { firestoreId: docData.id, ...docData.data() };
        }
        return null;
    }
};

// --- NOTIFICAÇÕES ---
const Toast = {
    show: (message, type = 'success') => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
        const color = type === 'success' ? '#10b981' : '#ef4444';
        toast.innerHTML = `<i class="fas fa-${icon}" style="color:${color}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};

// --- IMPRESSÃO ---
const Printer = {
    printContent: (htmlContent) => {
        const overlay = document.getElementById('print-overlay');
        overlay.innerHTML = htmlContent;
        document.body.classList.add('print-mode-ticket');
        setTimeout(() => {
            window.print();
            setTimeout(() => {
                document.body.classList.remove('print-mode-ticket');
                overlay.innerHTML = '';
            }, 500);
        }, 500);
    },
    printLabel: (book) => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${book.id}`;
        const content = `
            <div class="print-label">
                <div class="label-info">
                    <h2>LibAuto Acervo</h2>
                    <p><strong>ID:</strong> ${book.id}</p>
                    <p style="max-width: 150px;"><strong>Obra:</strong> ${book.title}</p>
                    <p><strong>Autor:</strong> ${book.author}</p>
                </div>
                <div class="label-qr"><img src="${qrUrl}" alt="QR Code"></div>
            </div>`;
        Printer.printContent(content);
    },
    printLoanReceipt: (loan, bookTitle) => {
        const now = new Date().toLocaleString('pt-BR');
        const returnDate = new Date(loan.dueDate).toLocaleDateString('pt-BR');
        const content = `
            <div class="print-ticket">
                <div class="ticket-header"><h2>RECIBO DE EMPRÉSTIMO</h2><p>LibAuto System</p><p>${now}</p></div>
                <div class="ticket-body">
                    <div class="ticket-row"><span>ALUNO:</span> <strong>${loan.studentName}</strong></div>
                    <div class="ticket-row"><span>RA:</span> <span>${loan.studentRa}</span></div>
                    <hr style="border:0; border-top:1px dashed #000; margin:5px 0;">
                    <div class="ticket-row"><span>LIVRO:</span> <strong>${bookTitle}</strong></div>
                    <div class="ticket-row"><span>CÓD:</span> <span>${loan.bookId}</span></div>
                </div>
                <span class="ticket-highlight">DEVOLVER EM:<br>${returnDate}</span>
                <div class="ticket-footer"><p>Sujeito a multa por atraso.</p></div>
            </div>`;
        Printer.printContent(content);
    },
    printReturnReceipt: (loan) => {
        const now = new Date().toLocaleString('pt-BR');
        const content = `
            <div class="print-ticket">
                <div class="ticket-header"><h2>COMPROVANTE DE DEVOLUÇÃO</h2><p>LibAuto System</p><p>${now}</p></div>
                <div class="ticket-body">
                    <div class="ticket-row"><span>ALUNO:</span> <strong>${loan.studentName}</strong></div>
                    <hr style="border:0; border-top:1px dashed #000; margin:5px 0;">
                    <div class="ticket-row"><span>LIVRO ID:</span> <span>${loan.bookId}</span></div>
                    <div class="ticket-row"><span>STATUS:</span> <strong>DEVOLVIDO</strong></div>
                </div>
                <div class="ticket-footer"><p>Obrigado por utilizar nossa biblioteca.</p></div>
            </div>`;
        Printer.printContent(content);
    }
};

// --- MODAL CONTROLLER ---
const Modal = {
    currentType: null,
    open: (type) => {
        Modal.currentType = type;
        const modal = document.getElementById('universal-modal');
        document.getElementById('modal-title').innerText = type === 'student' ? 'Buscar Aluno' : 'Buscar Livro';
        document.getElementById('modal-search-input').placeholder = type === 'student' ? 'Nome ou RA...' : 'Título, Autor ou ID...';
        modal.style.display = 'flex';
        document.getElementById('modal-search-input').focus();
        Modal.search('');
    },
    close: () => {
        document.getElementById('universal-modal').style.display = 'none';
    },
    search: async (query) => {
        const list = document.getElementById('modal-results-list');
        list.innerHTML = '<li class="no-result">Buscando...</li>';
        const q = query.toLowerCase();

        if (Modal.currentType === 'student') {
            const students = await DB.getAll('students');
            const filtered = students.filter(s => s.name.toLowerCase().includes(q) || s.ra.includes(q));
            
            list.innerHTML = '';
            if(filtered.length === 0) return list.innerHTML = '<li class="no-result">Nenhum aluno encontrado</li>';

            filtered.forEach(s => {
                const li = document.createElement('li');
                li.innerHTML = `<div><strong>${s.name}</strong><br><small>${s.course}</small></div><div class="badge badge-success">${s.ra}</div>`;
                li.onclick = () => {
                    document.getElementById('loan-student-display').value = s.name;
                    document.getElementById('loan-student-ra-hidden').value = s.ra;
                    Modal.close();
                };
                list.appendChild(li);
            });
        } else {
            const books = await DB.getAll('books');
            const filtered = books.filter(b => b.title.toLowerCase().includes(q) || b.id.includes(q));
            
            list.innerHTML = '';
            if(filtered.length === 0) return list.innerHTML = '<li class="no-result">Nenhum livro encontrado</li>';

            filtered.forEach(b => {
                const li = document.createElement('li');
                const badge = b.isAvailable ? '<div class="badge badge-success">Disponível</div>' : '<div class="badge badge-warning">Emprestado</div>';
                if(!b.isAvailable) li.style.opacity = '0.5';
                li.innerHTML = `<div><strong>${b.title}</strong><br><small>ID: ${b.id}</small></div>${badge}`;
                li.onclick = () => {
                    if(!b.isAvailable) return Toast.show('Livro indisponível!', 'error');
                    document.getElementById('loan-book-display').value = b.title;
                    document.getElementById('loan-book-id-hidden').value = b.id;
                    Modal.close();
                };
                list.appendChild(li);
            });
        }
    }
};

// --- LÓGICA DE UI E RENDERIZAÇÃO ---
const UI = {
    render: async () => {
        // Funções agora são assíncronas (esperam o banco de dados)
        await UI.updateDashboard();
        await UI.renderStudents();
        await UI.renderBooks();
        await UI.renderLoans();
        await UI.displayReports();
    },

    updateDashboard: async () => {
        const books = await DB.getAll('books');
        const students = await DB.getAll('students');
        
        document.getElementById('kpi-total-books').innerText = books.length;
        document.getElementById('kpi-total-students').innerText = students.length;
        document.getElementById('kpi-borrowed').innerText = books.filter(b => !b.isAvailable).length;
    },

    renderStudents: async () => {
        const list = document.getElementById('student-list');
        list.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
        
        const students = await DB.getAll('students');
        list.innerHTML = '';
        
        students.forEach(s => {
            // Usamos s.firestoreId para exclusão precisa
            list.innerHTML += `<tr><td>${s.ra}</td><td><strong>${s.name}</strong></td><td>${s.course} - ${s.turma}</td><td class="no-print"><button class="btn btn-sm btn-danger" onclick="window.Actions.deleteStudent('${s.firestoreId}', '${s.ra}')"><i class="fas fa-trash"></i></button></td></tr>`;
        });
    },

    renderBooks: async (filter = '') => {
        const list = document.getElementById('book-list');
        list.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
        
        const books = await DB.getAll('books');
        const filtered = books.filter(b => b.title.toLowerCase().includes(filter.toLowerCase()) || b.id.includes(filter));
        
        list.innerHTML = '';
        filtered.forEach(b => {
            const status = b.isAvailable ? '<span class="badge badge-success">Disponível</span>' : '<span class="badge badge-warning">Emprestado</span>';
            list.innerHTML += `<tr><td>${b.id}</td><td><strong>${b.title}</strong></td><td>${status}</td><td class="no-print"><button class="btn btn-sm btn-danger" onclick="window.Actions.deleteBook('${b.firestoreId}', '${b.id}')"><i class="fas fa-trash"></i></button></td></tr>`;
        });
    },

    renderLoans: async () => {
        const list = document.getElementById('active-loan-list');
        list.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
        
        const loans = await DB.getAll('loans');
        const activeLoans = loans.filter(l => l.isActive);
        
        list.innerHTML = '';
        activeLoans.forEach(l => {
            const isLate = new Date() > new Date(l.dueDate);
            list.innerHTML += `<tr><td>${l.bookId}</td><td>${l.studentName}</td><td style="${isLate?'color:var(--danger);font-weight:bold':''}">${new Date(l.dueDate).toLocaleDateString('pt-BR')} ${isLate?'!':''}</td><td class="no-print"><button class="btn btn-sm btn-primary" onclick="window.Actions.returnBook('${l.firestoreId}', '${l.bookId}')">Devolver</button></td></tr>`;
        });
    },

    displayReports: async () => {
        const list = document.getElementById('report-list');
        if(!list) return;
        
        const filterText = (document.getElementById('report-search')?.value || '').toLowerCase();
        const filterType = document.getElementById('report-filter')?.value || 'all';
        
        // Em um app real, filtraríamos direto no banco, mas aqui filtramos no JS para simplificar
        const loans = await DB.getAll('loans');
        
        list.innerHTML = '';
        const filtered = loans.filter(l => {
            const txt = ((l.studentName||'') + (l.bookId||'') + (l.studentRa||'')).toLowerCase();
            const matchesText = txt.includes(filterText);
            const matchesType = filterType === 'all' ? true : (filterType === 'active' ? l.isActive : !l.isActive);
            return matchesText && matchesType;
        }).sort((a,b) => new Date(b.dateLoaned) - new Date(a.dateLoaned));

        filtered.forEach(l => {
            const status = l.isActive ? '<span class="badge badge-warning">Aberto</span>' : '<span class="badge badge-success">Devolvido</span>';
            list.innerHTML += `<tr><td>${new Date(l.dateLoaned).toLocaleDateString('pt-BR')}</td><td>${l.bookId||'?'}</td><td>${l.studentName||'ND'}</td><td>${l.studentInfo||'-'}</td><td>${status}</td></tr>`;
        });
    },
    filterBooks: (v) => UI.renderBooks(v)
};

// --- AÇÕES GLOBAIS (Expostas para o HTML) ---
window.Actions = {
    deleteStudent: async (firestoreId, ra) => {
        if(confirm('Remover aluno do banco de dados?')) {
            const loans = await DB.getAll('loans');
            if(loans.some(l => l.studentRa === ra && l.isActive)) return Toast.show('Aluno com pendências!', 'error');
            
            await DB.delete('students', firestoreId);
            Toast.show('Aluno removido'); 
            UI.render();
        }
    },
    deleteBook: async (firestoreId, bookId) => {
        if(confirm('Remover livro do banco de dados?')) {
            const book = await DB.findItem('books', 'id', bookId);
            if(book && !book.isAvailable) return Toast.show('Livro está emprestado!', 'error');
            
            await DB.delete('books', firestoreId);
            Toast.show('Livro removido'); 
            UI.render();
        }
    },
    returnBook: async (loanFirestoreId, bookId) => {
        if(confirm('Confirmar devolução e imprimir recibo?')) {
            // Atualiza o Empréstimo no Banco
            await DB.update('loans', loanFirestoreId, {
                isActive: false,
                dateReturned: new Date().toISOString()
            });

            // Atualiza o Status do Livro no Banco
            const book = await DB.findItem('books', 'id', bookId);
            if(book) {
                await DB.update('books', book.firestoreId, { isAvailable: true });
            }

            // Pega o empréstimo atualizado para imprimir
            const loans = await DB.getAll('loans');
            const updatedLoan = loans.find(l => l.firestoreId === loanFirestoreId);
            
            Toast.show('Devolução confirmada!');
            UI.render();
            Printer.printReturnReceipt(updatedLoan);
        }
    }
};

// --- ROTEAMENTO ---
window.Router = {
    navigate: (sectionId) => {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
        document.getElementById(sectionId).classList.add('active-section');
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        const btn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.getAttribute('onclick').includes(sectionId));
        if(btn) btn.classList.add('active');
        // Ao trocar de aba, recarrega os dados do banco
        UI.render();
    }
};

// --- EXPOR OBJETOS NECESSÁRIOS ---
window.Modal = Modal;
window.UI = UI;

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => { 
    UI.render(); 
    document.getElementById('modal-search-input').addEventListener('keyup', (e) => Modal.search(e.target.value)); 
});
window.onclick = (e) => { if (e.target == document.getElementById('universal-modal')) Modal.close(); };

// --- EVENTOS DE FORMULÁRIO ---
document.getElementById('student-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const students = await DB.getAll('students');
    
    // Gerador de RA
    let newRa, exists = true;
    const now = new Date();
    const prefix = `${now.getFullYear()}${(now.getMonth()+1)<=6?'1':'2'}`;
    while(exists) {
        newRa = `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
        exists = students.some(s => s.ra === newRa);
    }

    const s = {
        name: document.getElementById('student-name').value,
        course: document.getElementById('student-course').value,
        turma: document.getElementById('student-class').value,
        ra: newRa
    };

    await DB.add('students', s);
    Toast.show(`Aluno Criado: ${s.ra}`); 
    e.target.reset(); 
    UI.render();
});

document.getElementById('book-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const books = await DB.getAll('books');
    
    // Gerador de ID
    let newId, exists = true;
    while(exists) {
        newId = Math.floor(10000 + Math.random() * 90000).toString();
        exists = books.some(b => b.id === newId);
    }

    const b = {
        title: document.getElementById('book-title').value,
        author: document.getElementById('book-author').value,
        id: newId,
        isAvailable: true
    };

    await DB.add('books', b);
    Toast.show(`Livro Salvo: ${b.id}`); 
    e.target.reset(); 
    UI.render();
    if(confirm("Imprimir etiqueta?")) Printer.printLabel(b);
});

document.getElementById('loan-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bid = document.getElementById('loan-book-id-hidden').value;
    const sra = document.getElementById('loan-student-ra-hidden').value;
    if(!bid || !sra) return Toast.show('Selecione Livro e Aluno', 'error');

    const s = await DB.findItem('students', 'ra', sra);
    const b = await DB.findItem('books', 'id', bid);
    
    if (!s || !b) return Toast.show('Erro ao encontrar dados no banco', 'error');

    const due = new Date();
    due.setDate(due.getDate() + CONFIG.loanDays);

    const l = {
        loanId: Date.now(),
        bookId: bid,
        studentRa: sra,
        studentName: s.name,
        studentInfo: `${s.course} - ${s.turma}`,
        dateLoaned: new Date().toISOString(),
        dueDate: due.toISOString(),
        isActive: true,
        dateReturned: null
    };
    
    // Salva o empréstimo
    await DB.add('loans', l);
    
    // Atualiza status do livro
    await DB.update('books', b.firestoreId, { isAvailable: false });
    
    Toast.show('Empréstimo realizado!'); 
    document.getElementById('loan-book-display').value = ''; 
    document.getElementById('loan-student-display').value = '';
    document.getElementById('loan-book-id-hidden').value = ''; 
    document.getElementById('loan-student-ra-hidden').value = '';
    
    UI.render();
    Printer.printLoanReceipt(l, b.title);
});