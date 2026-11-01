import { ClassStudentRecord } from '../../utils/chineseEngine';
import { getClassroomDataMode } from '../../utils/storageService';

export type ClassStudent = ClassStudentRecord;

export const STORAGE_KEY_STUDENTS = 'hanu_classroom_students_roster_v2';

export const DEFAULT_STUDENTS: ClassStudent[] = [
  {
    id: 'st-1',
    studentCode: 'HV-001',
    hskLevel: 'HSK 3',
    name: 'Lưu Thị Minh Thư',
    vocabScore: '18/18 từ',
    writingScore: '96% độ chuẩn nét',
    quizScore: '10/10 câu đúng',
    totalPoints: 98,
    status: 'Đã chấm tự động',
    timeSeconds: 36,
    streak: 12,
    feedback: 'Thuộc toàn bộ từ mới Buổi 13–19, nét chữ 初中 và 换 rất đều đẹp.',
  },
  {
    id: 'st-2',
    studentCode: 'HV-002',
    hskLevel: 'HSK 2',
    name: 'Nguyễn Hoàng Hải Yến',
    vocabScore: '17/18 từ',
    writingScore: '92% độ chuẩn nét',
    quizScore: '9/10 câu đúng',
    totalPoints: 94,
    status: 'Đã chấm tự động',
    timeSeconds: 44,
    streak: 8,
    feedback: 'Nắm vững cấu trúc 挺...的 và 咱们, cần lưu ý nét sổ móc chữ 刻.',
  },
  {
    id: 'st-3',
    studentCode: 'HV-003',
    hskLevel: 'HSK 2',
    name: 'Trần Quốc Bảo',
    vocabScore: '16/18 từ',
    writingScore: '89% độ chuẩn nét',
    quizScore: '9/10 câu đúng',
    totalPoints: 91,
    status: 'Đã chấm tự động',
    timeSeconds: 51,
    streak: 6,
    feedback: 'Hoàn thành đúng hạn, phản xạ ghép câu tiếng Trung rất nhanh.',
  },
  {
    id: 'st-4',
    studentCode: 'HV-004',
    hskLevel: 'HSK 3',
    name: 'Đặng Thanh Trúc',
    vocabScore: '18/18 từ',
    writingScore: '94% độ chuẩn nét',
    quizScore: '10/10 câu đúng',
    totalPoints: 97,
    status: 'Đã chấm tự động',
    timeSeconds: 39,
    streak: 10,
    feedback: 'Phát âm thanh mẫu zh, ch, sh rất chuẩn, bài viết chữ Mễ sạch đẹp.',
  },
  {
    id: 'st-5',
    studentCode: 'HV-005',
    hskLevel: 'HSK 1',
    name: 'Vũ Minh Đức',
    vocabScore: '15/18 từ',
    writingScore: '88% độ chuẩn nét',
    quizScore: '8/10 câu đúng',
    totalPoints: 89,
    status: 'Cần kèm thêm',
    timeSeconds: 58,
    streak: 4,
    feedback: 'Cần phân biệt rõ hơn cách dùng 怎么 vs 怎么样.',
  },
  {
    id: 'st-6',
    studentCode: 'HV-006',
    hskLevel: 'HSK 2',
    name: 'Phạm Quỳnh Nga',
    vocabScore: '17/18 từ',
    writingScore: '91% độ chuẩn nét',
    quizScore: '9/10 câu đúng',
    totalPoints: 93,
    status: 'Đã chấm tự động',
    timeSeconds: 47,
    streak: 7,
    feedback: 'Tự luận đặt câu rất tự nhiên, vận dụng tốt từ vựng 四季.',
  },
  {
    id: 'st-7',
    studentCode: 'HV-007',
    hskLevel: 'HSK 2',
    name: 'Lê Tuấn Kiệt',
    vocabScore: '16/18 từ',
    writingScore: '90% độ chuẩn nét',
    quizScore: '9/10 câu đúng',
    totalPoints: 92,
    status: 'Đã chấm tự động',
    timeSeconds: 49,
    streak: 6,
    feedback: 'Nắm vững trợ từ ngữ khí 呢 và 吧 trong câu hỏi.',
  },
  {
    id: 'st-8',
    studentCode: 'HV-008',
    hskLevel: 'HSK 3',
    name: 'Bùi Phương Linh',
    vocabScore: '18/18 từ',
    writingScore: '95% độ chuẩn nét',
    quizScore: '10/10 câu đúng',
    totalPoints: 98,
    status: 'Đã chấm tự động',
    timeSeconds: 37,
    streak: 11,
    feedback: 'Nét chữ thư pháp rất có hồn, đạt điểm tuyệt đối trắc nghiệm.',
  },
  {
    id: 'st-9',
    studentCode: 'HV-009',
    hskLevel: 'HSK 1',
    name: 'Hoàng Gia Huy',
    vocabScore: '15/18 từ',
    writingScore: '87% độ chuẩn nét',
    quizScore: '8/10 câu đúng',
    totalPoints: 88,
    status: 'Cần kèm thêm',
    timeSeconds: 62,
    streak: 3,
    feedback: 'Tiến bộ nhanh sau khi luyện cùng Trợ Giảng Gấu Trúc · 彬彬.',
  },
  {
    id: 'st-10',
    studentCode: 'HV-010',
    hskLevel: 'HSK 3',
    name: 'Ngô Thùy Trang',
    vocabScore: '17/18 từ',
    writingScore: '93% độ chuẩn nét',
    quizScore: '9/10 câu đúng',
    totalPoints: 95,
    status: 'Đã chấm tự động',
    timeSeconds: 42,
    streak: 9,
    feedback: 'Giao bài tập về nhà đúng hẹn, điểm nghe rất cao.',
  },
  {
    id: 'st-11',
    studentCode: 'HV-011',
    hskLevel: 'HSK 2',
    name: 'Đỗ Anh Khoa',
    vocabScore: '16/18 từ',
    writingScore: '89% độ chuẩn nét',
    quizScore: '9/10 câu đúng',
    totalPoints: 90,
    status: 'Đã chấm tự động',
    timeSeconds: 54,
    streak: 5,
    feedback: 'Phần ghép câu đạt 100%, chú ý thêm lượng từ 个 vs 件.',
  },
  {
    id: 'st-12',
    studentCode: 'HV-012',
    hskLevel: 'HSK 2',
    name: 'Trịnh Mai Phương',
    vocabScore: '17/18 từ',
    writingScore: '92% độ chuẩn nét',
    quizScore: '9/10 câu đúng',
    totalPoints: 93,
    status: 'Đã chấm tự động',
    timeSeconds: 46,
    streak: 7,
    feedback: 'Thái độ học tập chăm chỉ, hoàn thành xuất sắc các bài tập tuần.',
  },
];

export function getStoredStudentRoster(): ClassStudent[] {
  if (typeof window === 'undefined') return [];
  const mode = getClassroomDataMode();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          return mode === 'demo' ? DEFAULT_STUDENTS : [];
        }
        const normalized: ClassStudent[] = parsed.map((item, idx) => {
          const fallbackDefault = DEFAULT_STUDENTS[idx];
          return {
            ...item,
            name: item.name,
            studentCode:
              item.studentCode || fallbackDefault?.studentCode || `HV-${String(idx + 1).padStart(3, '0')}`,
            hskLevel: item.hskLevel || fallbackDefault?.hskLevel || 'HSK 2',
            timeSeconds:
              typeof item.timeSeconds === 'number' && item.timeSeconds > 0
                ? item.timeSeconds
                : fallbackDefault?.timeSeconds || Math.max(28, 128 - (item.totalPoints || 90)),
            streak:
              typeof item.streak === 'number' && item.streak > 0
                ? item.streak
                : fallbackDefault?.streak || Math.max(3, Math.round((item.totalPoints || 90) / 11)),
            status:
              item.totalPoints < 90
                ? 'Cần kèm thêm'
                : item.status || 'Đã chấm tự động',
          };
        });
        return normalized;
      }
    }
  } catch {
    // Fallback if storage is inaccessible
  }
  return mode === 'demo' ? DEFAULT_STUDENTS : [];
}
