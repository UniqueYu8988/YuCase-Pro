import pyautogui
import keyboard
import threading
import time
import pyperclip
import sys
import io

# 👑 v7.19: 进程级物理隔离版 - 击发即自毁
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

class AutoFiller:
    """自动化填报核心引擎 - v7.19 一次性装填版"""
    def __init__(self, speed_multiplier=1):
        pyautogui.FAILSAFE = True
        pyautogui.PAUSE = 0 
        self.stop_requested = False
        self.speed_multiplier = speed_multiplier
        self.base_interval = 0.5
        
        # 监听 Esc 作为最后的物理防线
        keyboard.add_hotkey('esc', self.emergency_shutdown)

    def emergency_shutdown(self):
        print("[EMERGENCY] Detected Esc, forcing process shutdown")
        sys.exit(1)

    def fill_data(self, fill_list):
        """核心填报线性流程：等待 F9 -> 填报 -> 销毁"""
        patient_name = fill_list[0] if fill_list else "未知患者"
        
        print(f"\n--- 🚀 [V7.19] 弹药已装填: {patient_name} ---")
        print("--- [READY_FOR_F9] 请确认光标位置后按下 F9 击发 ---")
        sys.stdout.flush()
        
        # 1. 等待 F9 击发脉冲
        keyboard.wait('f9')
        
        # 2. 物理手感同步：等待按键释放
        while keyboard.is_pressed('f9'):
            time.sleep(0.01)
            
        print("[FILLING_START] 击发成功，开始填报...")
        sys.stdout.flush()
        
        interval = self.base_interval / self.speed_multiplier

        try:
            for i, content in enumerate(fill_list):
                # 支持 F9/Esc 随时掐断
                if keyboard.is_pressed('esc'):
                    print("[ABORT] 用户强行中止")
                    return "ABORTED"
                
                is_empty = content is None or str(content).strip() == ""
                if is_empty:
                    pyautogui.press('tab')
                    time.sleep(max(0.005, interval / 2))
                    continue

                pyperclip.copy(str(content))
                pyautogui.hotkey('ctrl', 'v')
                pyautogui.press('tab')
                time.sleep(max(0.001, interval))
        except Exception as e:
            print(f"Fill error: {e}")
            return "ERROR"

        print("[SINGLE_DONE]")
        sys.stdout.flush()
        return "FINISHED"
