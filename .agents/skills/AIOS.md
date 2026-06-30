# AIOS — AI Operating System Architecture

> Tài liệu kiến trúc tổng thể cho hệ thống AIOS của Dashboard Điện Máy Xanh.

---

## 1. Sơ đồ kiến trúc

```
╔══════════════════════════════════════════════════════════════════╗
║                    AIOS — TẦNG 0: MASTER                        ║
║                                                                  ║
║   dien-may-xanh-dashboard-master                                 ║
║   Vai trò: Routing · Lifecycle · Quality Gate · Reporting        ║
║   KHÔNG BAO GIỜ tự giải quyết tác vụ kỹ thuật                   ║
╠══════════════════════════════════════════════════════════════════╣
║                    TẦNG 1: 5 DIRECTOR SKILLS                     ║
║                                                                  ║
║  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐║
║  │    BI    │ │    UI    │ │   ENG   │ │    AI    │ │   QA   │ ║
║  │ Director │ │ Director │ │Director │ │ Director │ │Director│ ║
║  │          │ │          │ │         │ │          │ │        │ ║
║  │ Phân tích│ │ Thiết kế │ │Implement│ │ Tự động  │ │Kiểm tra│ ║
║  │ Đề xuất  │ │ UI spec  │ │Tối ưu   │ │ AI/Bot   │ │Approve │ ║
║  └────┬─────┘ └────┬─────┘ └────┬────┘ └────┬─────┘ └────┬───┘ ║
║       │            │            │            │            │     ║
╠═══════╪════════════╪════════════╪════════════╪════════════╪═════╣
║       │   TẦNG 2: SPECIALIST SKILLS (14 skills)          │     ║
║       │            │            │            │            │     ║
║  Self-       ┌─────┴────┐ ┌────┴─────┐ ┌────┴────┐  Built-in  ║
║  contained   │5 UI      │ │7 ENG     │ │2 AI     │  checklists║
║              │skills    │ │skills    │ │skills   │  (10 gates)║
║              └──────────┘ └──────────┘ └─────────┘            ║
╠══════════════════════════════════════════════════════════════════╣
║                    TẦNG 3: CREATIVE SKILLS (4 skills)            ║
║                                                                  ║
║          brand · design · banner-design · slides                 ║
║          (Kích hoạt theo yêu cầu, không tự động)                ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 2. Cấu trúc thư mục

```
.agents/skills/
│
├── AIOS.md                              ← Tài liệu này
│
├── dien-may-xanh-dashboard-master/      ← TẦNG 0: Master Orchestrator
│   └── SKILL.md
│
├── retail-revenue-dashboard-expert/     ← TẦNG 1: BI Director
│   └── SKILL.md
│
├── ui-system-master/                    ← TẦNG 1: UI Director
│   └── SKILL.md
│
├── engineering-master/                  ← TẦNG 1: Engineering Director
│   └── SKILL.md
│
├── ai-operation-master/                 ← TẦNG 1: AI Director
│   └── SKILL.md
│
├── quality-master/                      ← TẦNG 1: Quality Director
│   └── SKILL.md
│
├── ui-ux-pro-max/                       ← TẦNG 2: UI Specialist
├── frontend-design/                     ← TẦNG 2: UI Specialist
├── design-system/                       ← TẦNG 2: UI Specialist
├── ui-styling/                          ← TẦNG 2: UI Specialist
├── tailwind-patterns/                   ← TẦNG 2: UI/ENG Specialist
│
├── react-best-practices/                ← TẦNG 2: ENG Specialist
├── react-component-performance/         ← TẦNG 2: ENG Specialist
├── react-patterns/                      ← TẦNG 2: ENG Specialist
├── typescript-expert/                   ← TẦNG 2: ENG Specialist
├── web-performance-optimization/        ← TẦNG 2: ENG Specialist
├── performance-optimizer/               ← TẦNG 2: ENG Specialist
├── google-sheets-automation/            ← TẦNG 2: ENG Specialist
│
├── analyze-project/                     ← TẦNG 2: AI Specialist
├── architecture/                        ← TẦNG 2: AI Specialist
│
├── brand/                               ← TẦNG 3: Creative
├── design/                              ← TẦNG 3: Creative
├── banner-design/                       ← TẦNG 3: Creative
└── slides/                              ← TẦNG 3: Creative
```

---

## 3. Routing Rules

### Bảng routing chính

| Yêu cầu người dùng | Director 1 | Director 2 | Director 3 | Final |
|---------------------|-----------|-----------|-----------|-------|
| "Thêm tính năng mới" | BI → xác định KPI | UI → thiết kế | ENG → implement | QA |
| "Sửa lỗi" | ENG → debug + fix | | | QA |
| "Cải thiện giao diện" | BI → KPI cần hiển thị | UI → redesign | ENG → implement | QA |
| "Tối ưu hiệu năng" | ENG → optimize | | | QA |
| "Tối ưu Google Sheets" | ENG → optimize | | | QA |
| "Phân tích doanh thu" | BI → analyze | | | — |
| "AI insights" | AI → design | ENG → implement | | QA |
| "Review code" | QA → review | | | — |
| "Kiến trúc" | AI → ADR | ENG → implement | | QA |
| "Redesign + implement" | BI → UI → ENG | | | QA |

### Quy tắc routing
1. **Single-Director**: Gửi trực tiếp đến Director duy nhất
2. **Multi-Director**: Tuân thủ thứ tự BI → UI → ENG → AI → QA
3. **QA luôn cuối**: Mọi tác vụ có thay đổi code phải qua QA
4. **BI không cần QA**: Phân tích thuần túy không cần quality gate

---

## 4. Communication Protocol

### Chuẩn giao tiếp giữa Director

Mỗi Director expose:

```yaml
# Identity
name: string              # Tên skill
role: "director"           # Vai trò trong hierarchy
domain: string             # Lĩnh vực chuyên môn

# Interface
purpose: string            # Mục đích tồn tại
inputs: InputSchema        # Dữ liệu đầu vào
outputs: OutputSchema      # Dữ liệu đầu ra
responsibilities: string[] # Danh sách trách nhiệm
boundaries: string[]       # Ranh giới (KHÔNG được làm gì)
trigger_conditions: string[] # Khi nào kích hoạt
children: string[]         # Danh sách child skills
success_criteria: string[] # Tiêu chí thành công
```

---

## 5. Execution Lifecycle

```
① UNDERSTAND  → Đọc yêu cầu, phân loại intent
② ANALYZE     → Đánh giá scope, impact, risk
③ PLAN        → Xác định Director + thứ tự
④ ROUTE       → Gửi request đến Director
⑤ EXECUTE     → Director thực thi (gọi child skills)
⑥ REVIEW      → Quality Master chạy 10 gates
⑦ OPTIMIZE    → Kiểm tra cơ hội tối ưu thêm
⑧ MEASURE     → Đo hiệu năng trước/sau
⑨ REPORT      → Tạo báo cáo chuẩn enterprise
```

---

## 6. Quality Gate (10 cổng)

| # | Gate | Kiểm tra bởi |
|---|------|-------------|
| 1 | Architecture | QA Director |
| 2 | Performance | QA Director |
| 3 | UI Consistency | QA Director |
| 4 | Code Quality | QA Director |
| 5 | TypeScript | QA Director |
| 6 | Security | QA Director |
| 7 | Spreadsheet Efficiency | QA Director |
| 8 | Apps Script Efficiency | QA Director |
| 9 | Accessibility | QA Director |
| 10 | Maintainability | QA Director |

> Chi tiết mỗi gate xem trong `quality-master/SKILL.md`.

---

## 7. Skill Naming Convention

| Cấp | Pattern | Ví dụ |
|-----|---------|-------|
| Master | `[project]-master` | `dien-may-xanh-dashboard-master` |
| Director | `[domain]-master` hoặc `[domain]-expert` | `engineering-master`, `retail-revenue-dashboard-expert` |
| Specialist | `[technology]-[focus]` | `react-best-practices`, `typescript-expert` |
| Creative | `[output-type]` | `banner-design`, `slides` |

### Quy tắc đặt tên
- Dùng kebab-case (dấu gạch ngang)
- Tên phải mô tả domain, không mô tả hành động
- Director kết thúc bằng `-master` hoặc `-expert`
- Specialist kết thúc bằng `-[focus]` cụ thể

---

## 8. Reporting Standard

Mọi báo cáo tuân thủ format:

```markdown
## Tóm tắt điều hành
## Phân tích
## Hành động đã thực hiện
## Skill đã kích hoạt
## Ảnh hưởng hiệu năng (bảng trước/sau)
## Kết quả Quality Gate (10 gates)
## Rủi ro
## Đề xuất cải thiện tiếp theo
```

---

## 9. Developer Guide — Thêm Skill mới

### Bước 1: Xác định cấp
- Specialist (dưới 1 Director) → Thêm vào `children` của Director
- Director mới (domain mới) → Thêm vào `children` của Master

### Bước 2: Tạo SKILL.md
```yaml
---
name: my-new-skill
description: "Mô tả ngắn gọn..."
version: 1.0.0
role: specialist | director
parent: engineering-master  # Director cha
children: []                # Skills con (nếu là Director)
---
```

### Bước 3: Cập nhật Director cha
Thêm tên skill vào `children` array trong frontmatter của Director cha.

### Bước 4: Cập nhật routing
Nếu skill mới thay đổi routing logic, cập nhật bảng routing trong Master.

### Bước 5: Verify
```bash
# Kiểm tra frontmatter hợp lệ
head -10 .agents/skills/my-new-skill/SKILL.md

# Đếm tổng skills
ls -d .agents/skills/*/ | wc -l
```

---

## 10. Future Expansion Guide

### Skills đề xuất thêm trong tương lai

| Skill | Director cha | Khi nào cần |
|-------|-------------|-------------|
| `testing-master` | Quality | Khi thêm unit tests (Vitest/Jest) |
| `cicd-automation` | Engineering | Khi setup CI/CD pipeline |
| `monitoring-master` | AI Operation | Khi cần real-time monitoring |
| `data-pipeline` | Engineering | Khi xử lý > 1M dòng thường xuyên |
| `mobile-optimization` | Engineering | Khi cần PWA hoặc mobile app |
| `multi-store` | BI Director | Khi mở rộng ra nhiều siêu thị |
| `localization` | UI Director | Khi cần đa ngôn ngữ |

### Mở rộng Director
Nếu 1 Director quản lý > 10 child skills → cân nhắc tách thành 2 Director.

### Plugin Architecture
Mỗi skill là 1 plugin độc lập:
- Thêm = tạo folder + SKILL.md
- Xóa = xóa folder
- Upgrade = sửa SKILL.md
- Không ảnh hưởng skill khác

---

## Thống kê hệ thống

| Cấp | Số lượng | Skills |
|-----|---------|--------|
| Master | 1 | dien-may-xanh-dashboard-master |
| Director | 5 | retail-revenue-dashboard-expert, ui-system-master, engineering-master, ai-operation-master, quality-master |
| Specialist | 14 | react-best-practices, react-component-performance, react-patterns, typescript-expert, web-performance-optimization, performance-optimizer, google-sheets-automation, ui-ux-pro-max, frontend-design, design-system, ui-styling, tailwind-patterns, analyze-project, architecture |
| Creative | 4 | brand, design, banner-design, slides |
| **Tổng** | **24** | |
