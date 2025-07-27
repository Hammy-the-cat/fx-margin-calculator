// データ管理モジュール
class DataManager {
    constructor() {
        this.teachers = [];
        this.classes = [];
        this.subjects = [];
        this.schedule = {};
    }

    // LocalStorage最適化
    saveToStorage() {
        try {
            const data = {
                teachers: this.teachers,
                classes: this.classes,
                subjects: this.subjects,
                timestamp: Date.now()
            };
            
            // データ圧縮（JSON文字列の圧縮）
            const compressed = JSON.stringify(data);
            localStorage.setItem('timetable-data', compressed);
            
            // 古いデータのクリーンアップ
            this.cleanupOldData();
            
            return true;
        } catch (error) {
            console.error('Storage save failed:', error);
            return false;
        }
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem('timetable-data');
            if (data) {
                const parsed = JSON.parse(data);
                this.teachers = parsed.teachers || [];
                this.classes = parsed.classes || [];
                this.subjects = parsed.subjects || [];
                
                console.log('DataManager: Loaded data from storage:', {
                    teachers: this.teachers.length,
                    classes: this.classes.length,
                    subjects: this.subjects.length
                });
                
                // データ整合性チェック
                this.validateData();
            } else {
                console.log('DataManager: No data found in storage');
            }
        } catch (error) {
            console.error('Storage load failed:', error);
            this.resetData();
        }
    }

    cleanupOldData() {
        const keys = Object.keys(localStorage);
        const oldKeys = keys.filter(key => 
            key.startsWith('timetable-') && 
            key !== 'timetable-data'
        );
        oldKeys.forEach(key => localStorage.removeItem(key));
    }

    validateData() {
        this.teachers = this.teachers.filter(t => t && t.name);
        this.classes = this.classes.filter(c => c && c.name);
        this.subjects = this.subjects.filter(s => s && s.name);
    }

    resetData() {
        this.teachers = [];
        this.classes = [];
        this.subjects = [];
        this.schedule = {};
    }

    // デフォルトクラスを初期化（1～6年生、各15クラス）
    initializeDefaultClasses() {
        const defaultClasses = [];
        
        // 各学年15クラスを生成（1～3年生）
        for (let grade = 1; grade <= 3; grade++) {
            for (let classNum = 1; classNum <= 15; classNum++) {
                const className = `${grade}年${classNum}組`; // 1年1組, 1年2組, ..., 3年15組
                defaultClasses.push({
                    id: `${grade}-${classNum}`,
                    name: className,
                    grade: grade,
                    type: 'regular', // 'regular' | 'special_support'
                    active: true // クラスが有効かどうか
                });
            }
        }
        
        this.classes = defaultClasses;
        this.saveToStorage();
    }

    // 特定学年のクラスを追加（1～6年生対応）
    addGradeClasses(grade) {
        console.log(`DataManager: Adding classes for grade ${grade}`);
        
        // 既存の同学年クラスを削除
        const beforeCount = this.classes.length;
        this.classes = this.classes.filter(c => c.grade !== grade);
        console.log(`Removed ${beforeCount - this.classes.length} existing grade ${grade} classes`);
        
        // 新しく15クラスを追加
        for (let classNum = 1; classNum <= 15; classNum++) {
            const className = `${grade}年${classNum}組`;
            const newClass = {
                id: `${grade}-${classNum}`,
                name: className,
                grade: grade,
                type: 'regular',
                active: true
            };
            this.classes.push(newClass);
            console.log(`Added class: ${className}`);
        }
        
        console.log(`Total classes after adding grade ${grade}:`, this.classes.length);
        this.saveToStorage();
    }

    // クラスタイプを切り替え
    toggleClassType(classId) {
        const classObj = this.classes.find(c => c.id === classId);
        if (classObj) {
            classObj.type = classObj.type === 'regular' ? 'special_support' : 'regular';
            if (classObj.type === 'special_support') {
                classObj.name = classObj.name.replace(/^(\d+)年(\d+)組$/, '$1年特支$2組');
            } else {
                classObj.name = classObj.name.replace(/^(\d+)年特支(\d+)組$/, '$1年$2組');
            }
            this.saveToStorage();
        }
    }

    // クラスの有効/無効を切り替え
    toggleClassActive(classId) {
        const classObj = this.classes.find(c => c.id === classId);
        if (classObj) {
            classObj.active = !classObj.active;
            this.saveToStorage();
        }
    }

    // 有効なクラスのみ取得
    getActiveClasses() {
        return this.classes.filter(c => c.active);
    }

    // 学年別クラス取得
    getClassesByGrade(grade) {
        return this.classes.filter(c => c.grade === grade);
    }

    // データ操作メソッド
    addTeacher(teacher) {
        this.teachers.push(teacher);
        this.saveToStorage();
    }

    removeTeacher(index) {
        this.teachers.splice(index, 1);
        this.saveToStorage();
    }

    addClass(classObj) {
        this.classes.push(classObj);
        this.saveToStorage();
    }

    removeClass(index) {
        this.classes.splice(index, 1);
        this.saveToStorage();
    }

    addSubject(subject) {
        this.subjects.push(subject);
        this.saveToStorage();
    }

    removeSubject(index) {
        this.subjects.splice(index, 1);
        this.saveToStorage();
    }
}