// UI管理モジュール
class UIManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.currentTab = 'settings';
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // 出力タブの場合はプレビューを更新
        if (tabName === 'output' && window.app) {
            window.app.updatePreview();
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    updateDisplay() {
        this.renderTeachers();
        this.renderClasses();
        this.renderSubjects();
    }

    renderTeachers() {
        const container = document.getElementById('teachers-list');
        if (!container) {
            console.warn('UIManager: teachers-list container not found');
            return;
        }
        
        console.log('UIManager: Rendering teachers, count:', this.dataManager.teachers.length);
        
        container.innerHTML = '';
        this.dataManager.teachers.forEach((teacher, index) => {
            const div = document.createElement('div');
            div.className = 'teacher-item';
            
            // 教科情報の表示
            let subjectsHtml = '';
            if (teacher.subjects && teacher.subjects.length > 0) {
                subjectsHtml = teacher.subjects.map(subject => {
                    const classInfo = subject.classes ? 
                        subject.classes.map(cls => cls.className).join(', ') : 
                        (subject.className || '');
                    return `<span class="subject-badge">${subject.subject} - ${classInfo}</span>`;
                }).join('');
            }

            // 会議情報の表示
            let meetingsHtml = '';
            if (teacher.meetings && teacher.meetings.length > 0) {
                meetingsHtml = teacher.meetings.map(meeting => 
                    `<span class="meeting-badge">${meeting}</span>`
                ).join('');
            }
            
            // 学年と担任種別の表示
            const gradeInfo = teacher.grade ? `${teacher.grade}年生` : '学年未設定';
            const roleInfo = teacher.roleText || '種別未設定';
            
            div.innerHTML = `
                <div class="teacher-info" onclick="app.showTeacherDetails(${index})" style="cursor: pointer;">
                    <div class="teacher-name"><strong>${teacher.name}</strong></div>
                    <div class="teacher-details">
                        <span class="grade-info">${gradeInfo}</span>
                        <span class="role-info">${roleInfo}</span>
                    </div>
                    <div class="teacher-subjects">${subjectsHtml}</div>
                    <div class="teacher-meetings">${meetingsHtml}</div>
                </div>
                <div class="teacher-actions">
                    <button onclick="app.showTeacherDetails(${index})" class="info-btn">詳細</button>
                    <button onclick="app.removeTeacher(${index})" class="remove-btn">削除</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    renderClasses() {
        const container = document.getElementById('classes-grid');
        if (!container) {
            console.warn('classes-grid container not found');
            return;
        }
        
        const classesToShow = this.dataManager.classes;
        console.log('Rendering classes:', classesToShow.length);
        
        container.innerHTML = '';
        classesToShow.forEach((cls) => {
            const div = document.createElement('div');
            const cardClasses = ['class-card'];
            
            if (cls.active) {
                cardClasses.push('active');
            } else {
                cardClasses.push('inactive');
            }
            
            if (cls.type === 'special_support') {
                cardClasses.push('special-support');
            }
            
            div.className = cardClasses.join(' ');
            
            const typeText = cls.type === 'special_support' ? '特別支援' : '通常';
            const activeText = cls.active ? '有効' : '無効';
            
            div.innerHTML = `
                <div class="class-header">
                    <span class="class-name">${cls.name}</span>
                    <span class="class-type-badge ${cls.type}">${typeText}</span>
                </div>
                <div class="class-info">
                    状態: ${activeText}
                </div>
                <div class="class-actions">
                    <button class="class-btn toggle-type" onclick="app.toggleClassType('${cls.id}')">
                        ${cls.type === 'regular' ? '特支に変更' : '通常に変更'}
                    </button>
                    <button class="class-btn toggle-active" onclick="app.toggleClassActive('${cls.id}')">
                        ${cls.active ? '無効化' : '有効化'}
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
        
        console.log('Rendered', container.children.length, 'class cards');
    }

    renderSubjects() {
        const container = document.getElementById('subjects-list');
        if (!container) return;
        
        container.innerHTML = '';
        this.dataManager.subjects.forEach((subject, index) => {
            const div = document.createElement('div');
            div.className = 'subject-item';
            div.innerHTML = `
                <span style="color: ${subject.color}">${subject.name}</span>
                <button onclick="app.removeSubject(${index})" class="remove-btn">削除</button>
            `;
            container.appendChild(div);
        });
    }

    // フォーム関連
    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    }

    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return null;

        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        return data;
    }

    // バリデーション
    validateInput(value, type = 'text') {
        if (type === 'text') {
            return value && value.trim().length > 0;
        }
        if (type === 'number') {
            return !isNaN(value) && parseInt(value) > 0;
        }
        return false;
    }
}