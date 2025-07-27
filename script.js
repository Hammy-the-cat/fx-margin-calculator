// TimetableGenerator メインクラス

class TimetableGenerator {
    constructor() {
        this.dataManager = new DataManager();
        this.uiManager = new UIManager(this.dataManager);
        this.currentGrade = 1; // 現在表示中の学年
        this.editingTeacherIndex = null; // 編集中の教師のインデックス
        this.isProcessing = false; // 処理中フラグ
        this.lastClickTime = 0; // 最後のクリック時間
        this.defaultMeetings = [
            { name: '職員会議', day: 3, period: 6 }, // 水曜日6時間目
            { name: '学年会議', day: 2, period: 6 }, // 火曜日6時間目
            { name: '教科会議', day: 4, period: 6 }, // 木曜日6時間目
            { name: '委員会', day: 5, period: 6 }, // 金曜日6時間目
            { name: 'PTA会議', day: 1, period: 7 }, // 月曜日7時間目
            { name: '特別支援会議', day: 3, period: 7 }, // 水曜日7時間目
            { name: '安全対策会議', day: 2, period: 7 }, // 火曜日7時間目
            { name: '研修会議', day: 4, period: 7 } // 木曜日7時間目
        ];
        this.init();
    }

    init() {
        try {
            console.log('TimetableGenerator: Starting initialization');
            this.dataManager.loadFromStorage();
            this.loadMeetings();
            this.setupEventListeners();
            this.setupAdditionalEventListeners();
            
            console.log('TimetableGenerator: UIManager instance:', this.uiManager);
            if (this.uiManager && typeof this.uiManager.updateDisplay === 'function') {
                this.uiManager.updateDisplay();
            } else {
                console.error('TimetableGenerator: UIManager not properly initialized');
            }
            
            this.renderClassesGrid();
            this.renderMeetingCheckboxes();
            console.log('TimetableGenerator: Initialization completed');
        } catch (error) {
            console.error('TimetableGenerator: Initialization failed:', error);
        }
    }

    updateDisplay() {
        try {
            if (this.uiManager && typeof this.uiManager.updateDisplay === 'function') {
                this.uiManager.updateDisplay();
            } else {
                console.error('TimetableGenerator: UIManager not available for updateDisplay');
            }
        } catch (error) {
            console.error('TimetableGenerator: updateDisplay failed:', error);
        }
    }

    setupEventListeners() {
        // タブ切り替え
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.uiManager.switchTab(e.target.dataset.tab);
            });
        });

        // 設定画面のイベント - 要素の存在確認付き
        this.safeAddEventListener('add-teacher', 'click', (e) => {
            console.log('Button clicked, preventing default and propagation');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // 短時間での重複クリックを防止
            if (this.lastClickTime && Date.now() - this.lastClickTime < 1000) {
                console.log('Duplicate click detected, ignoring');
                return;
            }
            this.lastClickTime = Date.now();
            
            this.addTeacher();
        });
        this.safeAddEventListener('init-default-classes', 'click', () => this.initializeDefaultClasses());
        this.safeAddEventListener('add-grade-1', 'click', () => this.addGradeClasses(1));
        this.safeAddEventListener('add-grade-2', 'click', () => this.addGradeClasses(2));
        this.safeAddEventListener('add-grade-3', 'click', () => this.addGradeClasses(3));
        this.safeAddEventListener('manage-meetings', 'click', () => this.showMeetingManager());
        
        // 学年表示切り替えボタン
        this.safeAddEventListener('view-all-classes', 'click', () => this.switchGradeView('all'));
        this.safeAddEventListener('view-grade-1', 'click', () => this.switchGradeView(1));
        this.safeAddEventListener('view-grade-2', 'click', () => this.switchGradeView(2));
        this.safeAddEventListener('view-grade-3', 'click', () => this.switchGradeView(3));
        
        // クラス管理ツール
        this.safeAddEventListener('bulk-delete-inactive', 'click', () => this.bulkDeleteInactiveClasses());
        this.safeAddEventListener('bulk-toggle-special', 'click', () => this.bulkToggleSpecialSupport());
        
        this.safeAddEventListener('save-settings', 'click', () => this.saveSettings());
        this.safeAddEventListener('load-settings', 'click', () => this.loadSettings());
        this.safeAddEventListener('reset-settings', 'click', () => this.resetSettings());

        // 生成画面のイベント
        this.safeAddEventListener('generate-schedule', 'click', () => this.generateSchedule());
        this.safeAddEventListener('manual-edit', 'click', () => this.enableManualEdit());

        // フルスクリーン機能
        this.safeAddEventListener('fullscreen-settings', 'click', () => this.toggleFullscreen('settings'));

        // 出力画面のイベント
        this.safeAddEventListener('export-pdf', 'click', () => this.exportPDF());
        this.safeAddEventListener('export-excel', 'click', () => this.exportExcel());
        this.safeAddEventListener('export-json', 'click', () => this.exportJSON());
        this.safeAddEventListener('import-json', 'change', (e) => this.importJSON(e));
        
        // 教師フォームのボタン選択イベント
        this.setupTeacherFormButtons();
        
        // 教科選択の変更監視
        for (let i = 1; i <= 3; i++) {
            this.safeAddEventListener(`teacher-subject-${i}`, 'change', () => {
                this.updateHoursDisplay(i);
                this.updateSubjectRows();
                // 教科が選択されたらクラス選択肢を更新
                this.updateClassOptions();
            });
        }
    }

    safeAddEventListener(elementId, event, callback) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, callback);
            console.log(`Event listener added for ${elementId}`);
        } else {
            console.log(`Element not found: ${elementId}`);
        }
    }
    
    setupTeacherFormButtons() {
        // 学年選択ボタン
        const gradeButtons = document.querySelectorAll('.grade-btn');
        gradeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // 他のボタンの選択状態をクリア
                gradeButtons.forEach(btn => btn.classList.remove('active'));
                // クリックされたボタンを選択状態に
                e.target.classList.add('active');
                // 隠しフィールドに値を設定
                document.getElementById('teacher-grade').value = e.target.dataset.grade;
                // クラス選択肢を更新
                this.updateClassOptions();
            });
        });
        
        // 担任種別選択ボタン
        const roleButtons = document.querySelectorAll('.role-btn');
        roleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // 他のボタンの選択状態をクリア
                roleButtons.forEach(btn => btn.classList.remove('active'));
                // クリックされたボタンを選択状態に
                e.target.classList.add('active');
                // 隠しフィールドに値を設定
                document.getElementById('teacher-role').value = e.target.dataset.role;
            });
        });
    }
    
    setupAdditionalEventListeners() {
        this.safeAddEventListener('export-project', 'click', () => this.exportProject());
        
        this.safeAddEventListener('import-project-btn', 'click', () => {
            document.getElementById('import-project').click();
        });
        this.safeAddEventListener('import-project', 'change', (e) => this.importProject(e));
    }


    // === 設定画面の機能 ===
    addTeacher() {
        // 処理中フラグでの重複実行防止
        console.log('addTeacher called, isProcessing:', this.isProcessing);
        if (this.isProcessing) {
            console.log('Already processing, skipping...');
            return;
        }
        this.isProcessing = true;
        console.log('Setting isProcessing to true');
        
        console.log('Adding/Updating teacher...');
        console.log('Editing mode:', this.editingTeacherIndex !== null);
        console.log('Call stack:', new Error().stack);
        
        const nameField = document.getElementById('teacher-name');
        const gradeField = document.getElementById('teacher-grade');
        const roleField = document.getElementById('teacher-role');
        
        console.log('Form elements:', {
            nameField: nameField,
            gradeField: gradeField,
            roleField: roleField
        });
        
        const teacherName = nameField ? nameField.value.trim() : '';
        const teacherGrade = gradeField ? gradeField.value : '';
        const teacherRole = roleField ? roleField.value : '';
        
        console.log('Form values - Name:', teacherName, 'Grade:', teacherGrade, 'Role:', teacherRole);
        console.log('Raw values - Name:', nameField?.value, 'Grade:', gradeField?.value, 'Role:', roleField?.value);
        
        // バリデーション
        if (!teacherName) {
            console.log('Validation failed: teacher name is empty');
            this.isProcessing = false; // フラグをリセット
            if (this.editingTeacherIndex !== null) {
                this.showMessage('教師名が入力されていません', 'error');
            } else {
                this.showMessage('教師名を入力してください', 'error');
            }
            return;
        }
        
        if (!teacherGrade) {
            this.isProcessing = false; // フラグをリセット
            if (this.editingTeacherIndex !== null) {
                this.showMessage('担当学年が選択されていません', 'error');
            } else {
                this.showMessage('担当学年を選択してください', 'error');
            }
            return;
        }
        
        if (!teacherRole) {
            this.isProcessing = false; // フラグをリセット
            if (this.editingTeacherIndex !== null) {
                this.showMessage('担任種別が選択されていません', 'error');
            } else {
                this.showMessage('担任種別を選択してください', 'error');
            }
            return;
        }
        
        // 選択された会議を収集
        const meetings = [];
        const meetingCheckboxes = document.querySelectorAll('#meeting-checkboxes input[type="checkbox"]:checked');
        meetingCheckboxes.forEach(checkbox => {
            meetings.push(checkbox.value);
        });

        // 選択された教科と担当クラスを収集
        const subjects = [];
        for (let i = 1; i <= 3; i++) {
            const subjectSelect = document.getElementById(`teacher-subject-${i}`);
            const checkboxContainer = document.getElementById(`class-checkboxes-${i}`);
            
            if (subjectSelect && subjectSelect.value && checkboxContainer) {
                // 選択されたクラスボタンを取得
                const activeButtons = checkboxContainer.querySelectorAll('.class-button.active');
                const selectedClasses = [];
                
                activeButtons.forEach(button => {
                    const classId = button.dataset.classId;
                    const selectedClass = this.dataManager.classes.find(c => c.id === classId);
                    if (selectedClass) {
                        selectedClasses.push({
                            classId: classId,
                            className: selectedClass.name
                        });
                    }
                });
                
                if (selectedClasses.length > 0) {
                    subjects.push({
                        subject: subjectSelect.value,
                        classes: selectedClasses
                    });
                }
            }
        }
        
        if (subjects.length === 0) {
            this.isProcessing = false; // フラグをリセット
            if (this.editingTeacherIndex !== null) {
                this.showMessage('最低1つの教科と担当クラスが必要です', 'error');
            } else {
                this.showMessage('最低1つの教科と担当クラスを選択してください', 'error');
            }
            return;
        }
        
        const teacher = {
            id: this.editingTeacherIndex !== null ? this.dataManager.teachers[this.editingTeacherIndex].id : Date.now().toString(),
            name: teacherName,
            grade: parseInt(teacherGrade),
            role: teacherRole,
            roleText: teacherRole === 'homeroom' ? '学級担任' : '副担任',
            subjects: subjects,
            meetings: meetings
        };
        
        const isEditMode = this.editingTeacherIndex !== null;
        
        if (isEditMode) {
            // 編集モード: 既存の教師を更新
            this.dataManager.teachers[this.editingTeacherIndex] = teacher;
            this.dataManager.saveToStorage();
            console.log('Teacher updated:', teacher);
            this.showMessage('更新されました', 'success');
            this.uiManager.updateDisplay();
            
            // 即座に編集モードを解除してフラグをリセット
            this.cancelEdit();
            this.isProcessing = false;
            console.log('Edit mode cancelled and processing completed');
        } else {
            // 新規追加モード
            this.dataManager.addTeacher(teacher);
            console.log('Teacher added:', teacher);
            this.showMessage('教師を追加しました', 'success');
            this.clearTeacherForm();
            this.uiManager.updateDisplay();
            
            // 処理完了フラグをリセット
            this.isProcessing = false;
        }
    }

    initializeDefaultClasses() {
        console.log('Initializing default classes...');
        this.dataManager.initializeDefaultClasses();
        this.uiManager.updateDisplay();
        this.updateClassOptions();
        this.renderClassesGrid();
    }

    addGradeClasses(grade) {
        console.log(`Adding classes for grade ${grade}...`);
        this.dataManager.addGradeClasses(grade);
        this.uiManager.updateDisplay();
        this.updateClassOptions();
        this.renderClassesGrid();
    }

    clearTeacherForm() {
        document.getElementById('teacher-name').value = '';
        document.getElementById('teacher-grade').value = '';
        document.getElementById('teacher-role').value = '';
        
        // ボタンの選択状態をクリア
        document.querySelectorAll('.grade-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
        
        // 会議チェックボックスをクリア
        const meetingCheckboxes = document.querySelectorAll('#meeting-checkboxes input[type="checkbox"]');
        meetingCheckboxes.forEach(checkbox => checkbox.checked = false);

        for (let i = 1; i <= 3; i++) {
            const subjectSelect = document.getElementById(`teacher-subject-${i}`);
            const checkboxContainer = document.getElementById(`class-checkboxes-${i}`);
            const row = document.getElementById(`subject-row-${i}`);
            
            if (subjectSelect) subjectSelect.value = '';
            if (checkboxContainer) {
                // 全てのボタンの選択状態をクリア
                const buttons = checkboxContainer.querySelectorAll('.class-button');
                buttons.forEach(button => button.classList.remove('active'));
            }
            
            // 2行目以降は非表示に
            if (i > 1 && row) {
                row.style.display = 'none';
            }
        }
    }

    updateClassOptions() {
        console.log('Updating class options...');
        
        // 全ての登録されているクラスを取得
        const availableClasses = this.dataManager.classes;
        
        console.log('Available classes:', availableClasses);
        
        // 各教科行のクラス選択肢を更新
        for (let i = 1; i <= 3; i++) {
            this.updateClassCheckboxes(i, availableClasses);
        }
    }
    
    updateClassCheckboxes(subjectIndex, availableClasses) {
        const container = document.getElementById(`class-checkboxes-${subjectIndex}`);
        if (!container) return;
        
        container.innerHTML = '';
        
        // 学年ごとにソートして表示
        const sortedClasses = availableClasses
            .filter(classObj => classObj.active)
            .sort((a, b) => {
                if (a.grade !== b.grade) {
                    return a.grade - b.grade;
                }
                return a.name.localeCompare(b.name);
            });

        sortedClasses.forEach(classObj => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'class-button';
            button.textContent = classObj.name;
            button.dataset.classId = classObj.id;
            button.dataset.subjectIndex = subjectIndex;
            
            // ボタンクリックイベント
            button.addEventListener('click', (e) => {
                e.preventDefault();
                button.classList.toggle('active');
            });
            
            container.appendChild(button);
        });
    }

    updateHoursDisplay(rowNumber) {
        // 時数表示の更新ロジック
        const hoursDisplay = document.getElementById(`hours-display-${rowNumber}`);
        if (hoursDisplay) {
            hoursDisplay.textContent = '-'; // 仮の実装
        }
    }

    updateSubjectRows() {
        // 教科行の表示更新ロジック
        for (let i = 1; i <= 3; i++) {
            const subjectSelect = document.getElementById(`teacher-subject-${i}`);
            const row = document.getElementById(`subject-row-${i}`);
            
            if (subjectSelect && subjectSelect.value && row) {
                row.style.display = 'flex';
                
                // 次の行を表示
                if (i < 3) {
                    const nextRow = document.getElementById(`subject-row-${i + 1}`);
                    if (nextRow && nextRow.style.display === 'none') {
                        nextRow.style.display = 'flex';
                    }
                }
            }
        }
    }

    // === 基本機能 ===
    generateSchedule() {
        console.log('時間割生成中...');
        alert('時間割生成機能は準備中です');
    }

    enableManualEdit() {
        console.log('手動編集モード');
        alert('手動編集機能は準備中です');
    }

    toggleFullscreen(tabName) {
        const tab = document.getElementById(`${tabName}-tab`);
        const header = document.querySelector('header');
        
        if (tab.classList.contains('fullscreen')) {
            tab.classList.remove('fullscreen');
            header.style.display = 'block';
        } else {
            tab.classList.add('fullscreen');
            header.style.display = 'none';
        }
    }

    saveSettings() {
        this.dataManager.saveToStorage();
        alert('設定を保存しました');
    }

    loadSettings() {
        this.dataManager.loadFromStorage();
        this.uiManager.updateDisplay();
        this.updateClassOptions();
        this.renderClassesGrid();
        alert('設定を読み込みました');
    }

    resetSettings() {
        if (confirm('すべての設定をリセットしますか？')) {
            this.dataManager.teachers = [];
            this.dataManager.classes = [];
            this.dataManager.subjects = [];
            this.dataManager.saveToStorage();
            this.uiManager.updateDisplay();
            this.renderClassesGrid();
            alert('設定をリセットしました');
        }
    }

    exportPDF() {
        alert('PDF出力機能は準備中です');
    }

    exportExcel() {
        alert('Excel出力機能は準備中です');
    }

    exportJSON() {
        const data = {
            teachers: this.dataManager.teachers,
            classes: this.dataManager.classes,
            subjects: this.dataManager.subjects,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'timetable-data.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.teachers && data.classes) {
                    this.dataManager.teachers = data.teachers;
                    this.dataManager.classes = data.classes;
                    this.dataManager.subjects = data.subjects || [];
                    
                    this.dataManager.saveToStorage();
                    this.uiManager.updateDisplay();
                    this.updateClassOptions();
                    
                    alert('データを読み込みました');
                } else {
                    alert('無効なファイル形式です');
                }
            } catch (error) {
                alert('ファイルの読み込みに失敗しました');
            }
        };
        reader.readAsText(file);
    }

    exportProject() {
        this.exportJSON();
    }

    importProject(event) {
        this.importJSON(event);
    }

    // 学年表示を切り替え
    switchGradeView(grade) {
        this.currentGrade = grade;
        
        // 学年表示ボタンのアクティブ状態を更新
        document.querySelectorAll('.grade-view-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (grade === 'all') {
            document.getElementById('view-all-classes').classList.add('active');
        } else {
            document.getElementById(`view-grade-${grade}`).classList.add('active');
        }
        
        // クラス一覧を再描画
        this.renderClassesGrid();
    }

    // クラス一覧をグリッド表示
    renderClassesGrid() {
        console.log('renderClassesGrid called, currentGrade:', this.currentGrade);
        const container = document.getElementById('classes-grid');
        if (!container) {
            console.log('classes-grid container not found');
            return;
        }

        container.innerHTML = '';
        
        console.log('Total classes:', this.dataManager.classes.length);
        if (this.dataManager.classes.length === 0) {
            container.innerHTML = '<p class="no-classes">クラスが登録されていません。デフォルトクラス初期化ボタンを押してクラスを作成してください。</p>';
            return;
        }

        if (this.currentGrade === 'all') {
            // 全クラス表示
            this.renderAllClassesGrid(container);
        } else {
            // 学年別表示
            this.renderGradeClassesGrid(container, this.currentGrade);
        }
    }
    
    // 全クラス表示
    renderAllClassesGrid(container) {
        const allClasses = this.dataManager.classes;
        
        // 学年ごとにグループ化（1～3年のみ）
        for (let grade = 1; grade <= 3; grade++) {
            const gradeClasses = allClasses.filter(cls => cls.grade === grade);
            if (gradeClasses.length > 0) {
                this.renderGradeSectionInAll(container, grade, gradeClasses);
            }
        }
    }
    
    // 学年別表示
    renderGradeClassesGrid(container, grade) {
        const currentGradeClasses = this.dataManager.classes.filter(cls => cls.grade === grade);
        console.log(`Grade ${grade} classes:`, currentGradeClasses.length);
        
        if (currentGradeClasses.length === 0) {
            container.innerHTML = `<p class="no-classes">${grade}年生のクラスが登録されていません。「${grade}年生追加」ボタンを押してクラスを作成してください。</p>`;
            return;
        }

        this.renderGradeSectionInAll(container, grade, currentGradeClasses);
    }
    
    // 学年セクションを描画（共通関数）
    renderGradeSectionInAll(container, grade, gradeClasses) {
        const gradeSection = document.createElement('div');
        gradeSection.className = 'grade-section';
        
        const gradeHeader = document.createElement('h3');
        gradeHeader.className = 'grade-header';
        gradeHeader.innerHTML = `
            ${grade}年生 (${gradeClasses.length}クラス)
            ${this.currentGrade === 'all' ? `<button onclick="timetable.switchGradeView(${grade})" class="view-grade-btn">学年別表示へ</button>` : ''}
        `;
        gradeSection.appendChild(gradeHeader);

        const classGrid = document.createElement('div');
        classGrid.className = 'class-grid';

        gradeClasses.forEach(cls => {
            const classCard = document.createElement('div');
            classCard.className = `class-card ${cls.active ? 'active' : 'inactive'} ${cls.type === 'special_support' ? 'special-support' : 'regular'}`;
            classCard.innerHTML = `
                <div class="class-info">
                    <div class="class-name">${cls.name}</div>
                    <div class="class-details">
                        <span class="class-type">${cls.type === 'special_support' ? '特別支援' : '普通'}</span>
                        <span class="class-status">${cls.active ? '有効' : '無効'}</span>
                    </div>
                </div>
                <div class="class-actions">
                    <button onclick="timetable.toggleClassType('${cls.id}')" class="toggle-type-btn" title="クラスタイプ切り替え">
                        ${cls.type === 'special_support' ? '普通' : '特支'}
                    </button>
                    <button onclick="timetable.toggleClassActive('${cls.id}')" class="toggle-active-btn" title="有効/無効切り替え">
                        ${cls.active ? '無効' : '有効'}
                    </button>
                    <button onclick="timetable.removeClass('${cls.id}')" class="remove-btn" title="削除">×</button>
                </div>
            `;
            classGrid.appendChild(classCard);
        });

        gradeSection.appendChild(classGrid);
        container.appendChild(gradeSection);
    }

    // クラスタイプを切り替え
    toggleClassType(classId) {
        this.dataManager.toggleClassType(classId);
        this.renderClassesGrid();
        this.updateClassOptions();
    }

    // クラスの有効/無効を切り替え
    toggleClassActive(classId) {
        this.dataManager.toggleClassActive(classId);
        this.renderClassesGrid();
        this.updateClassOptions();
    }

    // クラスを削除
    removeClass(classId) {
        const classObj = this.dataManager.classes.find(c => c.id === classId);
        if (classObj && confirm(`${classObj.name}を削除しますか？`)) {
            this.dataManager.classes = this.dataManager.classes.filter(c => c.id !== classId);
            this.dataManager.saveToStorage();
            this.renderClassesGrid();
            this.updateClassOptions();
            this.uiManager.showNotification(`${classObj.name}を削除しました`);
        }
    }
    
    // 無効クラスを一括削除
    bulkDeleteInactiveClasses() {
        const inactiveClasses = this.dataManager.classes.filter(c => !c.active);
        
        if (inactiveClasses.length === 0) {
            this.uiManager.showNotification('無効なクラスがありません', 'info');
            return;
        }
        
        const classNames = inactiveClasses.map(c => c.name).join(', ');
        if (confirm(`無効な${inactiveClasses.length}個のクラスを削除しますか？\n\n削除対象: ${classNames}`)) {
            this.dataManager.classes = this.dataManager.classes.filter(c => c.active);
            this.dataManager.saveToStorage();
            this.renderClassesGrid();
            this.updateClassOptions();
            this.uiManager.showNotification(`${inactiveClasses.length}個の無効クラスを削除しました`);
        }
    }
    
    // 選択クラスを特別支援に一括切り替え
    bulkToggleSpecialSupport() {
        // 現在表示中の通常クラスを取得
        let targetClasses;
        if (this.currentGrade === 'all') {
            targetClasses = this.dataManager.classes.filter(c => c.type === 'regular' && c.active);
        } else {
            targetClasses = this.dataManager.classes.filter(c => c.grade === this.currentGrade && c.type === 'regular' && c.active);
        }
        
        if (targetClasses.length === 0) {
            this.uiManager.showNotification('対象となる通常クラスがありません', 'info');
            return;
        }
        
        const gradeText = this.currentGrade === 'all' ? '全学年' : `${this.currentGrade}年生`;
        if (confirm(`${gradeText}の有効な通常クラス${targetClasses.length}個を特別支援クラスに変更しますか？`)) {
            targetClasses.forEach(cls => {
                this.dataManager.toggleClassType(cls.id);
            });
            this.renderClassesGrid();
            this.updateClassOptions();
            this.uiManager.showNotification(`${targetClasses.length}個のクラスを特別支援に変更しました`);
        }
    }

    // === レンダリング機能 ===
    renderAllData() {
        this.uiManager.updateDisplay();
        this.renderSchedule();
    }


    renderSchedule() {
        const cells = document.querySelectorAll('.schedule-cell');
        
        cells.forEach(cell => {
            const day = parseInt(cell.dataset.day);
            const period = parseInt(cell.dataset.period);
            const key = `${day}-${period}`;
            const assignment = this.schedule[key];
            
            if (assignment) {
                cell.classList.add('has-subject');
                cell.style.backgroundColor = assignment.subject.color;
                cell.innerHTML = `
                    <div class="subject-content">
                        <div class="subject-name">${assignment.subject.name}</div>
                        <div class="subject-details">
                            ${assignment.teacher ? assignment.teacher.name : ''}
                            ${assignment.class ? `<br>${assignment.class.name}` : ''}
                        </div>
                    </div>
                `;
            } else {
                cell.classList.remove('has-subject');
                cell.style.backgroundColor = '';
                cell.innerHTML = '';
            }
        });
    }

    // === 時間割生成機能 ===
    generateSchedule() {
        if (this.subjects.length === 0 || this.teachers.length === 0 || this.classes.length === 0) {
            this.showMessage('教師、クラス、教科の情報を設定してください', 'error');
            return;
        }

        this.schedule = {};
        
        const optimizeTeachers = document.getElementById('optimize-teachers').checked;
        const avoidConflicts = document.getElementById('avoid-conflicts').checked;
        const balanceSubjects = document.getElementById('balance-subjects').checked;

        // シンプルな時間割生成アルゴリズム
        const totalSlots = 5 * 6; // 5日 × 6限
        const assignments = [];

        // 各教科について必要な授業時間数分の割り当てを作成
        this.subjects.forEach(subject => {
            for (let i = 0; i < subject.hours; i++) {
                // 対応する教師を見つける
                const teacher = this.teachers.find(t => t.subject === subject.name);
                // 最初のクラスを使用（複数クラス対応は今後の拡張）
                const classObj = this.classes[0];
                
                assignments.push({
                    subject,
                    teacher,
                    class: classObj
                });
            }
        });

        // ランダムに時間割に配置
        const shuffledAssignments = this.shuffleArray([...assignments]);
        
        for (let day = 0; day < 5; day++) {
            for (let period = 0; period < 6; period++) {
                const key = `${day}-${period}`;
                const assignmentIndex = day * 6 + period;
                
                if (assignmentIndex < shuffledAssignments.length) {
                    this.schedule[key] = shuffledAssignments[assignmentIndex];
                }
            }
        }

        this.renderSchedule();
        this.saveToStorage();
        this.showMessage('時間割を生成しました');
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    enableManualEdit() {
        // 手動編集モードを有効にする（ドラッグ&ドロップ機能）
        this.showMessage('手動編集モードは今後実装予定です', 'info');
    }

    // === 出力機能 ===
    exportPNG() {
        this.showMessage('PNG出力機能は今後実装予定です', 'info');
    }

    exportPDF() {
        this.showMessage('PDF出力機能は今後実装予定です', 'info');
    }

    exportJSON() {
        const data = {
            teachers: this.teachers,
            classes: this.classes,
            subjects: this.subjects,
            schedule: this.schedule
        };
        
        this.downloadFile('timetable.json', JSON.stringify(data, null, 2), 'application/json');
        this.showMessage('JSONファイルをダウンロードしました');
    }

    exportCSV() {
        this.showMessage('CSV出力機能は今後実装予定です', 'info');
    }

    exportExcel() {
        this.showMessage('Excel出力機能は今後実装予定です', 'info');
    }

    exportProject() {
        this.exportJSON();
    }

    importProject(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.teachers && data.classes && data.subjects && data.schedule) {
                    this.teachers = data.teachers;
                    this.classes = data.classes;
                    this.subjects = data.subjects;
                    this.schedule = data.schedule;
                    
                    this.renderAllData();
                    this.saveToStorage();
                    this.showMessage('プロジェクトファイルを読み込みました');
                } else {
                    this.showMessage('無効なプロジェクトファイルです', 'error');
                }
            } catch (error) {
                this.showMessage('ファイルの読み込みに失敗しました', 'error');
            }
        };
        reader.readAsText(file);
    }

    toggleFullscreen(tabName) {
        const tab = document.getElementById(`${tabName}-tab`);
        const header = document.querySelector('header');
        
        if (tab.classList.contains('fullscreen')) {
            // フルスクリーンを終了
            tab.classList.remove('fullscreen');
            header.style.display = 'block';
            
            // フルスクリーンヘッダーを削除
            const fullscreenHeader = tab.querySelector('.fullscreen-header');
            if (fullscreenHeader) {
                fullscreenHeader.remove();
            }
        } else {
            // フルスクリーンに切り替え
            tab.classList.add('fullscreen');
            header.style.display = 'none';
            
            // フルスクリーンヘッダーを追加
            const fullscreenHeader = document.createElement('div');
            fullscreenHeader.className = 'fullscreen-header';
            fullscreenHeader.innerHTML = `
                <h1 class="fullscreen-title">設定画面</h1>
                <button class="fullscreen-close" onclick="timetable.toggleFullscreen('${tabName}')">
                    全画面表示を終了
                </button>
            `;
            tab.insertBefore(fullscreenHeader, tab.firstChild);
        }
    }

    updatePreview() {
        const preview = document.getElementById('schedule-preview');
        
        if (Object.keys(this.schedule).length === 0) {
            preview.innerHTML = '<p>時間割を生成してからプレビューが表示されます</p>';
        } else {
            // 簡単なテーブル形式でプレビューを表示
            let html = '<table style="width: 100%; border-collapse: collapse;">';
            html += '<tr><th></th><th>月</th><th>火</th><th>水</th><th>木</th><th>金</th></tr>';
            
            for (let period = 0; period < 6; period++) {
                html += `<tr><th>${period + 1}限</th>`;
                for (let day = 0; day < 5; day++) {
                    const key = `${day}-${period}`;
                    const assignment = this.schedule[key];
                    const content = assignment ? assignment.subject.name : '-';
                    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${content}</td>`;
                }
                html += '</tr>';
            }
            html += '</table>';
            preview.innerHTML = html;
        }
    }

    // === ユーティリティ機能 ===

    removeTeacher(index) {
        this.dataManager.removeTeacher(index);
        this.uiManager.updateDisplay();
    }

    showTeacherDetails(index) {
        const teacher = this.dataManager.teachers[index];
        if (!teacher) return;

        // ポップアップウィンドウのHTMLを作成
        const subjectsDetails = teacher.subjects.map(subject => {
            const classNames = subject.classes ? 
                subject.classes.map(cls => cls.className).join(', ') : 
                (subject.className || '未設定');
            return `
                <div class="subject-detail">
                    <span class="subject-name">${subject.subject}</span>
                    <span class="class-list">${classNames}</span>
                </div>
            `;
        }).join('');

        // 会議詳細の作成
        const meetingsDetails = teacher.meetings && teacher.meetings.length > 0 ? 
            teacher.meetings.map(meeting => `<span class="meeting-tag">${meeting}</span>`).join('') : 
            '<span class="no-meetings">参加会議なし</span>';

        const popupContent = `
            <div class="teacher-popup-overlay" onclick="this.remove()">
                <div class="teacher-popup" onclick="event.stopPropagation()">
                    <div class="popup-header">
                        <h3>教師詳細情報</h3>
                        <button class="close-btn" onclick="this.closest('.teacher-popup-overlay').remove()">&times;</button>
                    </div>
                    <div class="popup-content">
                        <div class="teacher-basic-info">
                            <h4>${teacher.name}</h4>
                            <p><strong>担当学年:</strong> ${teacher.grade}年生</p>
                            <p><strong>担任種別:</strong> ${teacher.roleText}</p>
                        </div>
                        <div class="teacher-subjects-detail">
                            <h5>担当教科・クラス</h5>
                            ${subjectsDetails}
                        </div>
                        <div class="teacher-meetings-detail">
                            <h5>参加会議</h5>
                            <div class="meetings-list">${meetingsDetails}</div>
                        </div>
                        <div class="popup-actions">
                            <button class="edit-btn" onclick="app.editTeacher(${index})">編集</button>
                            <button class="delete-btn" onclick="app.confirmDeleteTeacher(${index})">削除</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // ポップアップを表示
        document.body.insertAdjacentHTML('beforeend', popupContent);
    }

    editTeacher(index) {
        const teacher = this.dataManager.teachers[index];
        if (!teacher) return;

        // 既存のポップアップを閉じる
        const existingPopup = document.querySelector('.teacher-popup-overlay');
        if (existingPopup) {
            existingPopup.remove();
        }

        // フォームに既存データを設定
        this.populateTeacherForm(teacher);
        
        // 編集モードを設定
        this.editingTeacherIndex = index;
        
        // 追加ボタンのテキストを変更
        const addButton = document.getElementById('add-teacher');
        if (addButton) {
            addButton.textContent = '教師を更新';
            addButton.style.background = 'var(--neon-orange)';
            addButton.disabled = false; // 有効化
        }
        
        // キャンセルボタンを表示
        this.showCancelEditButton();
    }

    populateTeacherForm(teacher) {
        console.log('Populating form with teacher:', teacher);
        
        // 教師名
        const nameField = document.getElementById('teacher-name');
        if (nameField) {
            nameField.value = teacher.name || '';
            console.log('Set teacher name:', nameField.value);
        }

        // 学年選択
        const gradeButtons = document.querySelectorAll('.grade-btn');
        gradeButtons.forEach(btn => {
            btn.classList.remove('active');
            if (teacher.grade && btn.dataset.grade === teacher.grade.toString()) {
                btn.classList.add('active');
            }
        });
        const gradeField = document.getElementById('teacher-grade');
        if (gradeField) {
            gradeField.value = teacher.grade || '';
            console.log('Set teacher grade:', gradeField.value);
        }

        // 担任種別選択
        const roleButtons = document.querySelectorAll('.role-btn');
        roleButtons.forEach(btn => {
            btn.classList.remove('active');
            if (teacher.role && btn.dataset.role === teacher.role) {
                btn.classList.add('active');
            }
        });
        const roleField = document.getElementById('teacher-role');
        if (roleField) {
            roleField.value = teacher.role || '';
            console.log('Set teacher role:', roleField.value);
        }

        // 会議選択の設定
        if (teacher.meetings && teacher.meetings.length > 0) {
            teacher.meetings.forEach(meetingName => {
                const checkbox = document.querySelector(`input[value="${meetingName}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }

        // クラス選択肢を更新
        this.updateClassOptions();

        // 教科とクラス設定を同期的に実行
        if (teacher.subjects && teacher.subjects.length > 0) {
            teacher.subjects.forEach((subject, index) => {
                if (index < 3) {
                    const subjectIndex = index + 1;
                    
                    // 教科選択
                    const subjectSelect = document.getElementById(`teacher-subject-${subjectIndex}`);
                    if (subjectSelect && subject.subject) {
                        subjectSelect.value = subject.subject;
                    }

                    // 教科行を表示
                    const subjectRow = document.getElementById(`subject-row-${subjectIndex}`);
                    if (subjectRow && subjectIndex > 1) {
                        subjectRow.style.display = 'flex';
                    }
                }
            });

            // クラス選択を少し遅延させて確実に設定
            setTimeout(() => {
                teacher.subjects.forEach((subject, index) => {
                    if (index < 3) {
                        const subjectIndex = index + 1;
                        const classContainer = document.getElementById(`class-checkboxes-${subjectIndex}`);
                        if (classContainer && subject.classes) {
                            subject.classes.forEach(cls => {
                                if (cls && cls.classId) {
                                    const button = classContainer.querySelector(`[data-class-id="${cls.classId}"]`);
                                    if (button) {
                                        button.classList.add('active');
                                    }
                                }
                            });
                        }
                    }
                });
            }, 200);
        }
    }

    showCancelEditButton() {
        const buttonContainer = document.querySelector('.teacher-form');
        if (!buttonContainer) return;

        // 既存のキャンセルボタンを削除
        const existingCancel = buttonContainer.querySelector('.cancel-edit-btn');
        if (existingCancel) existingCancel.remove();

        // キャンセルボタンを作成
        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'cancel-edit-btn secondary-button';
        cancelButton.textContent = '編集をキャンセル';
        cancelButton.onclick = () => this.cancelEdit();

        // 追加ボタンの後に挿入
        const addButton = document.getElementById('add-teacher');
        if (addButton) {
            addButton.parentNode.insertBefore(cancelButton, addButton.nextSibling);
        }
    }

    cancelEdit() {
        console.log('cancelEdit called');
        
        // 編集モードを解除
        this.editingTeacherIndex = null;
        
        // フォームをクリア
        this.clearTeacherForm();
        
        // 追加ボタンのテキストを戻す
        const addButton = document.getElementById('add-teacher');
        if (addButton) {
            addButton.textContent = '教師を追加';
            addButton.style.background = '';
        }
        
        // キャンセルボタンを削除
        const cancelButton = document.querySelector('.cancel-edit-btn');
        if (cancelButton) cancelButton.remove();
        
        // 処理中フラグは呼び出し元でリセットされるため、ここではリセットしない
        
        console.log('cancelEdit completed');
    }

    // === 会議管理機能 ===
    loadMeetings() {
        console.log('loadMeetings called');
        console.log('defaultMeetings:', this.defaultMeetings);
        
        const savedMeetings = localStorage.getItem('school-meetings');
        if (savedMeetings) {
            const parsedMeetings = JSON.parse(savedMeetings);
            
            // 既存の文字列形式データを新しいオブジェクト形式にマイグレーション
            if (parsedMeetings.length > 0 && typeof parsedMeetings[0] === 'string') {
                console.log('Migrating old meeting format to new format');
                this.meetings = parsedMeetings.map((meetingName, index) => ({
                    name: meetingName,
                    day: (index % 5) + 1, // 月曜日から金曜日に分散
                    period: index < 4 ? 6 : 7 // 最初の4つは6時間目、残りは7時間目
                }));
                this.saveMeetings(); // 新しい形式で保存
                console.log('Migrated meetings:', this.meetings);
            } else {
                this.meetings = parsedMeetings;
                console.log('Loaded meetings from storage:', this.meetings);
            }
        } else {
            this.meetings = [...this.defaultMeetings];
            this.saveMeetings();
            console.log('Initialized meetings with defaults:', this.meetings);
        }
    }

    saveMeetings() {
        localStorage.setItem('school-meetings', JSON.stringify(this.meetings));
    }

    renderMeetingCheckboxes() {
        console.log('renderMeetingCheckboxes called');
        console.log('Current meetings for checkboxes:', this.meetings);
        
        const container = document.getElementById('meeting-checkboxes');
        if (!container) {
            console.warn('meeting-checkboxes container not found');
            return;
        }

        container.innerHTML = '';
        this.meetings.forEach((meeting, index) => {
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'meeting-checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `meeting-${index}`;
            checkbox.value = meeting.name;
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = `${meeting.name} (${this.getDayName(meeting.day)}${meeting.period}時間目)`;
            
            checkboxItem.appendChild(checkbox);
            checkboxItem.appendChild(label);
            container.appendChild(checkboxItem);
        });
    }

    getDayName(dayNumber) {
        const days = ['', '月', '火', '水', '木', '金', '土', '日'];
        return days[dayNumber] || '';
    }

    showMeetingManager() {
        console.log('showMeetingManager called');
        console.log('this.meetings:', this.meetings);
        
        if (!this.meetings || this.meetings.length === 0) {
            console.warn('No meetings available');
            this.uiManager.showNotification('会議データが読み込まれていません', 'error');
            return;
        }
        
        const meetingsList = this.meetings.map((meeting, index) => `
            <div class="meeting-item">
                <div class="meeting-inputs">
                    <input type="text" class="meeting-name-input" data-index="${index}" value="${meeting.name}" placeholder="会議名">
                    <select class="meeting-day-select" data-index="${index}">
                        <option value="1" ${meeting.day === 1 ? 'selected' : ''}>月曜日</option>
                        <option value="2" ${meeting.day === 2 ? 'selected' : ''}>火曜日</option>
                        <option value="3" ${meeting.day === 3 ? 'selected' : ''}>水曜日</option>
                        <option value="4" ${meeting.day === 4 ? 'selected' : ''}>木曜日</option>
                        <option value="5" ${meeting.day === 5 ? 'selected' : ''}>金曜日</option>
                    </select>
                    <select class="meeting-period-select" data-index="${index}">
                        <option value="1" ${meeting.period === 1 ? 'selected' : ''}>1時間目</option>
                        <option value="2" ${meeting.period === 2 ? 'selected' : ''}>2時間目</option>
                        <option value="3" ${meeting.period === 3 ? 'selected' : ''}>3時間目</option>
                        <option value="4" ${meeting.period === 4 ? 'selected' : ''}>4時間目</option>
                        <option value="5" ${meeting.period === 5 ? 'selected' : ''}>5時間目</option>
                        <option value="6" ${meeting.period === 6 ? 'selected' : ''}>6時間目</option>
                        <option value="7" ${meeting.period === 7 ? 'selected' : ''}>7時間目</option>
                    </select>
                </div>
                <button class="remove-meeting-btn" onclick="app.removeMeeting(${index})">削除</button>
            </div>
        `).join('');

        const popupContent = `
            <div class="meeting-manager-overlay" onclick="this.remove()">
                <div class="meeting-manager-popup" onclick="event.stopPropagation()">
                    <div class="popup-header">
                        <h3>会議名管理</h3>
                        <button class="close-btn" onclick="this.closest('.meeting-manager-overlay').remove()">&times;</button>
                    </div>
                    <div class="popup-content">
                        <div class="meetings-list">
                            ${meetingsList}
                        </div>
                        <div class="add-meeting-section">
                            <h4>新しい会議を追加</h4>
                            <div class="add-meeting-inputs">
                                <input type="text" id="new-meeting-name" placeholder="会議名">
                                <select id="new-meeting-day">
                                    <option value="1">月曜日</option>
                                    <option value="2">火曜日</option>
                                    <option value="3" selected>水曜日</option>
                                    <option value="4">木曜日</option>
                                    <option value="5">金曜日</option>
                                </select>
                                <select id="new-meeting-period">
                                    <option value="1">1時間目</option>
                                    <option value="2">2時間目</option>
                                    <option value="3">3時間目</option>
                                    <option value="4">4時間目</option>
                                    <option value="5">5時間目</option>
                                    <option value="6" selected>6時間目</option>
                                    <option value="7">7時間目</option>
                                </select>
                                <button onclick="app.addMeeting()" class="add-meeting-btn">追加</button>
                            </div>
                        </div>
                        <div class="meeting-actions">
                            <button onclick="app.saveMeetingChanges()" class="save-btn">変更を保存</button>
                            <button onclick="app.resetToDefault()" class="reset-btn">デフォルトに戻す</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 既存のポップアップがあれば削除
        const existingPopup = document.querySelector('.meeting-manager-overlay');
        if (existingPopup) {
            console.log('Removing existing popup');
            existingPopup.remove();
        }
        
        console.log('Creating meeting manager popup');
        document.body.insertAdjacentHTML('beforeend', popupContent);
        
        // ポップアップが正しく作成されたか確認
        const popup = document.querySelector('.meeting-manager-overlay');
        if (popup) {
            console.log('Meeting manager popup created successfully');
            // アニメーション用にshowクラスを少し遅れて追加
            setTimeout(() => {
                popup.classList.add('show');
                console.log('Show class added to popup');
            }, 10);
        } else {
            console.error('Failed to create meeting manager popup');
        }
    }

    addMeeting() {
        const nameInput = document.getElementById('new-meeting-name');
        const daySelect = document.getElementById('new-meeting-day');
        const periodSelect = document.getElementById('new-meeting-period');
        
        const meetingName = nameInput.value.trim();
        const day = parseInt(daySelect.value);
        const period = parseInt(periodSelect.value);
        
        if (!meetingName) {
            this.uiManager.showNotification('会議名を入力してください', 'error');
            return;
        }

        if (this.meetings.some(meeting => meeting.name === meetingName)) {
            this.uiManager.showNotification('その会議名は既に存在します', 'error');
            return;
        }

        const newMeeting = {
            name: meetingName,
            day: day,
            period: period
        };

        this.meetings.push(newMeeting);
        nameInput.value = '';
        daySelect.value = '3'; // デフォルトに戻す
        periodSelect.value = '6'; // デフォルトに戻す
        
        this.updateMeetingsList();
        this.saveMeetings(); // LocalStorageに保存
        this.renderMeetingCheckboxes(); // チェックボックスを更新
        console.log('Meeting added:', newMeeting);
    }

    removeMeeting(index) {
        const meeting = this.meetings[index];
        if (confirm(`「${meeting.name}」を削除しますか？`)) {
            this.meetings.splice(index, 1);
            this.updateMeetingsList();
            this.saveMeetings(); // LocalStorageに保存
            this.renderMeetingCheckboxes(); // チェックボックスを更新
            console.log('Meeting removed:', meeting);
        }
    }

    updateMeetingsList() {
        const container = document.querySelector('.meetings-list');
        if (!container) return;

        const meetingsList = this.meetings.map((meeting, index) => `
            <div class="meeting-item">
                <input type="text" class="meeting-name-input" data-index="${index}" value="${meeting}">
                <button class="remove-meeting-btn" onclick="app.removeMeeting(${index})">削除</button>
            </div>
        `).join('');

        container.innerHTML = meetingsList;
    }

    saveMeetingChanges() {
        console.log('saveMeetingChanges called');
        const nameInputs = document.querySelectorAll('.meeting-name-input');
        const daySelects = document.querySelectorAll('.meeting-day-select');
        const periodSelects = document.querySelectorAll('.meeting-period-select');
        const newMeetings = [];
        
        nameInputs.forEach((input, index) => {
            const name = input.value.trim();
            if (name) {
                const day = parseInt(daySelects[index].value);
                const period = parseInt(periodSelects[index].value);
                newMeetings.push({
                    name: name,
                    day: day,
                    period: period
                });
            }
        });

        console.log('Previous meetings:', this.meetings);
        console.log('New meetings:', newMeetings);

        this.meetings = newMeetings;
        this.saveMeetings();
        this.renderMeetingCheckboxes();
        
        const popup = document.querySelector('.meeting-manager-overlay');
        if (popup) popup.remove();
        
        this.uiManager.showNotification('会議名を更新しました', 'success');
    }

    resetToDefault() {
        if (confirm('会議名をデフォルトに戻しますか？')) {
            this.meetings = [...this.defaultMeetings];
            this.updateMeetingsList();
        }
    }

    confirmDeleteTeacher(index) {
        const teacher = this.dataManager.teachers[index];
        if (!teacher) return;

        if (confirm(`「${teacher.name}」を削除しますか？`)) {
            this.removeTeacher(index);
            
            // ポップアップを閉じる
            const popup = document.querySelector('.teacher-popup-overlay');
            if (popup) popup.remove();
        }
    }

    clearClassForm() {
        document.getElementById('class-name').value = '';
        document.getElementById('class-students').value = '';
    }

    clearSubjectForm() {
        document.getElementById('subject-name').value = '';
        document.getElementById('subject-hours').value = '';
        document.getElementById('subject-color').value = '#4CAF50';
    }

    saveSettings() {
        this.saveToStorage();
        this.showMessage('設定を保存しました');
    }

    loadSettings() {
        this.loadFromStorage();
        this.renderAllData();
        this.showMessage('設定を読み込みました');
    }

    resetSettings() {
        if (confirm('すべての設定をリセットしますか？')) {
            this.teachers = [];
            this.classes = [];
            this.subjects = [];
            this.schedule = {};
            this.renderAllData();
            this.saveToStorage();
            this.showMessage('設定をリセットしました');
        }
    }

    saveToStorage() {
        const data = {
            teachers: this.teachers,
            classes: this.classes,
            subjects: this.subjects,
            schedule: this.schedule
        };
        localStorage.setItem('timetable-generator-data', JSON.stringify(data));
    }

    loadFromStorage() {
        const data = localStorage.getItem('timetable-generator-data');
        if (data) {
            const parsed = JSON.parse(data);
            this.teachers = parsed.teachers || [];
            this.classes = parsed.classes || [];
            this.subjects = parsed.subjects || [];
            this.schedule = parsed.schedule || {};
        }
    }

    downloadFile(filename, content, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showMessage(message, type = 'success') {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'notification';
        messageDiv.textContent = message;
        
        if (type === 'error') {
            messageDiv.style.backgroundColor = '#f44336';
        } else if (type === 'info') {
            messageDiv.style.backgroundColor = '#2196F3';
        }
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            messageDiv.classList.remove('show');
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    document.body.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }
}

// アプリケーションの初期化
const app = new TimetableGenerator();

// グローバル関数として timetable も提供（後方互換性のため）
window.timetable = app;

// 通知のスタイル
const style = document.createElement('style');
style.textContent = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 1rem 2rem;
    border-radius: 4px;
    z-index: 10000;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
    font-weight: 500;
}

.notification.show {
    opacity: 1;
    transform: translateX(0);
}
`;
document.head.appendChild(style);

// 特別支援教育クラス別時数管理
class SpecialSupportHoursManager {
    constructor() {
        this.classHoursConfig = new Map(); // クラスID -> 時数設定のマップ
        this.currentSelectedClass = null;
        this.loadFromStorage();
        this.initializeEvents();
        this.loadSpecialSupportClasses();
    }

    initializeEvents() {
        // クラス選択ドロップダウンの変更イベント
        const classSelector = document.getElementById('special-class-selector');
        if (classSelector) {
            classSelector.addEventListener('change', (e) => {
                this.selectClass(e.target.value);
            });
        }

        // 設定読み込みボタン
        const loadButton = document.getElementById('load-class-config');
        if (loadButton) {
            loadButton.addEventListener('click', () => {
                this.loadClassConfig();
            });
        }

        // 保存ボタン
        const saveButton = document.getElementById('save-special-config');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.saveClassConfig();
            });
        }

        // リセットボタン
        const resetButton = document.getElementById('reset-special-config');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetToDefault();
            });
        }

        // 時数入力フィールドの変更監視
        this.setupHoursInputListeners();
    }

    setupHoursInputListeners() {
        const hoursInputs = document.querySelectorAll('.hours-input');
        hoursInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.calculateTotal();
            });
        });
    }

    loadSpecialSupportClasses() {
        const classSelector = document.getElementById('special-class-selector');
        if (!classSelector) return;

        // 既存のoptionをクリア（最初のデフォルトオプション以外）
        while (classSelector.children.length > 1) {
            classSelector.removeChild(classSelector.lastChild);
        }

        // 特別支援クラスを取得してドロップダウンに追加
        const specialSupportClasses = this.getSpecialSupportClasses();
        console.log('特別支援クラス:', specialSupportClasses);
        
        specialSupportClasses.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.name;
            classSelector.appendChild(option);
        });
    }

    getSpecialSupportClasses() {
        // DataManagerからクラス情報を取得
        if (typeof timetable !== 'undefined' && timetable.classes) {
            console.log('全クラス:', timetable.classes);
            const specialClasses = timetable.classes.filter(cls => {
                console.log('クラス確認:', cls.name, 'タイプ:', cls.type);
                return cls.type === '特別支援' || cls.type === 'special-support';
            });
            console.log('フィルター後の特別支援クラス:', specialClasses);
            return specialClasses;
        }
        return [];
    }

    // クラス情報が更新された時に呼び出される関数
    refreshClassList() {
        this.loadSpecialSupportClasses();
    }

    selectClass(classId) {
        if (!classId) {
            this.hideConfigSection();
            return;
        }

        this.currentSelectedClass = classId;
        this.showConfigSection();
        this.updateClassTitle(classId);
        this.loadClassConfig();
    }

    showConfigSection() {
        const configSection = document.getElementById('hours-config-section');
        if (configSection) {
            configSection.style.display = 'block';
        }
    }

    hideConfigSection() {
        const configSection = document.getElementById('hours-config-section');
        if (configSection) {
            configSection.style.display = 'none';
        }
        this.currentSelectedClass = null;
    }

    updateClassTitle(classId) {
        const titleElement = document.getElementById('current-class-title');
        const className = this.getClassName(classId);
        if (titleElement) {
            titleElement.textContent = `設定中: ${className}`;
        }
    }

    getClassName(classId) {
        const cls = timetable.classes.find(c => c.id === classId);
        return cls ? cls.name : `クラス ${classId}`;
    }

    loadClassConfig() {
        if (!this.currentSelectedClass) return;

        // 保存された設定があるかチェック
        const savedConfig = this.classHoursConfig.get(this.currentSelectedClass);
        
        if (savedConfig) {
            // 保存された設定を入力フィールドに反映
            this.applyConfigToForm(savedConfig);
        } else {
            // デフォルト値（29時間基準）を設定
            this.setDefaultHours();
        }
        
        this.calculateTotal();
    }

    applyConfigToForm(config) {
        Object.entries(config).forEach(([subjectId, hours]) => {
            const input = document.getElementById(subjectId);
            if (input) {
                input.value = hours;
            }
        });
    }

    setDefaultHours() {
        // 29時間基準のデフォルト値
        const defaultHours = {
            'special-kokugo': 4,
            'special-shakai': 2,
            'special-sugaku': 4,
            'special-rika': 2,
            'special-ongaku': 2,
            'special-bijutsu': 1,
            'special-taiiku': 3,
            'special-gijutsu': 2,
            'special-gaikokugo': 3,
            'special-doutoku': 1,
            'special-sougou': 2,
            'special-tokkatsu': 1,
            'special-jiritsu': 1,
            'special-sagyou': 1
        };

        this.applyConfigToForm(defaultHours);
    }

    saveClassConfig() {
        if (!this.currentSelectedClass) {
            alert('クラスが選択されていません');
            return;
        }

        // 現在の入力値を取得
        const config = this.getCurrentFormConfig();
        
        // マップに保存
        this.classHoursConfig.set(this.currentSelectedClass, config);
        
        // LocalStorageに保存
        this.saveToStorage();
        
        alert(`${this.getClassName(this.currentSelectedClass)}の時数設定を保存しました`);
    }

    getCurrentFormConfig() {
        const config = {};
        const hoursInputs = document.querySelectorAll('.hours-input');
        
        hoursInputs.forEach(input => {
            config[input.id] = parseInt(input.value) || 0;
        });
        
        return config;
    }

    resetToDefault() {
        if (confirm('29時間基準のデフォルト値に戻しますか？')) {
            this.setDefaultHours();
            this.calculateTotal();
        }
    }

    calculateTotal() {
        let total = 0;
        const hoursInputs = document.querySelectorAll('.hours-input');
        
        hoursInputs.forEach(input => {
            total += parseInt(input.value) || 0;
        });

        const totalDisplay = document.getElementById('total-hours-display');
        if (totalDisplay) {
            totalDisplay.textContent = total;
            
            // 色分け表示
            totalDisplay.className = 'total-number';
            if (total === 29) {
                totalDisplay.classList.add('good');
            } else if (Math.abs(total - 29) > 3) {
                totalDisplay.classList.add('warning');
            }
        }
    }

    saveToStorage() {
        const data = Object.fromEntries(this.classHoursConfig);
        localStorage.setItem('special-support-hours-config', JSON.stringify(data));
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem('special-support-hours-config');
            if (data) {
                const parsed = JSON.parse(data);
                this.classHoursConfig = new Map(Object.entries(parsed));
            }
        } catch (error) {
            console.error('特別支援時数設定の読み込みに失敗:', error);
        }
    }
}

// アプリケーションを初期化
let timetable;

document.addEventListener('DOMContentLoaded', () => {
    console.log('時間割ジェネレーターが初期化されました');
    
    // TimetableGeneratorを初期化
    try {
        timetable = new TimetableGenerator();
        console.log('TimetableGenerator初期化完了');
    } catch (error) {
        console.error('TimetableGenerator初期化エラー:', error);
    }
    
    // 特別支援教育時数管理を初期化
    setTimeout(() => {
        try {
            if (typeof SpecialSupportHoursManager !== 'undefined') {
                window.specialSupportManager = new SpecialSupportHoursManager();
                console.log('特別支援教育時数管理が初期化されました');
                
                // クラス管理システムとの連携を設定
                setupClassManagementIntegration();
            }
        } catch (error) {
            console.error('SpecialSupportHoursManager初期化エラー:', error);
        }
    }, 1000); // DOM構築完了を待つ
});

// クラス管理システムとの連携設定
function setupClassManagementIntegration() {
    // クラス切り替えボタンのクリックイベントを監視
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                // クラス情報が更新された可能性がある
                if (window.specialSupportManager) {
                    setTimeout(() => {
                        window.specialSupportManager.refreshClassList();
                    }, 100);
                }
            }
        });
    });

    // クラス表示エリアを監視
    const classesGrid = document.getElementById('classes-grid');
    if (classesGrid) {
        observer.observe(classesGrid, {
            childList: true,
            subtree: true
        });
    }

    // 初期読み込み時にもクラスリストを更新
    if (window.specialSupportManager) {
        setTimeout(() => {
            window.specialSupportManager.refreshClassList();
        }, 500);
    }
}