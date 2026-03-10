import sys
import json
import base64
from auto_filler import AutoFiller
import io

# 👑 v7.19: 进程级物理隔离 - 一次性执行脚本
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def main():
    if len(sys.argv) < 3:
        print("Usage: python execute_filling.py <base64_json_fill_list> <speed_multiplier>")
        return

    try:
        # v7.19: 脚本启动即打点，引擎已准备好监听 F9
        print("[ENGINE_INITIALIZED]")
        sys.stdout.flush()
        
        # 1. 解析传入的唯一数据负载
        fill_list_json = base64.b64decode(sys.argv[1]).decode('utf-8')
        fill_list = json.loads(fill_list_json)
        speed = float(sys.argv[2])
        
        filler = AutoFiller(speed_multiplier=speed)

        # 2. 执行单次填报任务（内部阻塞等待 F9）
        status = filler.fill_data(fill_list)
        
        # 3. 任务结束（无论成功/中止），打印最终结果
        if status == "FINISHED":
            # 信号已在 filler 中发出 ([SINGLE_DONE])
            pass
        elif status == "ABORTED":
            print(f"\n[STATUS_JSON]{json.dumps({'status': 'ABORTED'})}[/STATUS_JSON]")
        
        # 4. 彻底自毁，释放键盘钩子与内存
        sys.exit(0)

    except Exception as e:
        print(f"Fatal error in V7.19 Engine: {e}")
        sys.stdout.flush()
        sys.exit(1)

if __name__ == "__main__":
    main()
