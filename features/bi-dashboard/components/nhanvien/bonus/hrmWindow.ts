// Tab HRM mở khi bấm "Thủ công" — lưu ref module-level để BonusDataModal có thể
// focus lại đúng tab đó sau khi lưu, tách khỏi BonusView nên cần getter/setter
// thay vì biến module-level dùng chung trực tiếp như bản gốc.
let hrmWindowRef: Window | null = null;

export function setHrmWindowRef(win: Window | null) {
    hrmWindowRef = win;
}

export function focusHrmWindow() {
    if (hrmWindowRef && !hrmWindowRef.closed) {
        hrmWindowRef.focus();
    }
}
