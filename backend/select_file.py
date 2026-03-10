from parser_engine import ParserEngine
import sys

# 皇家标准：强制 UTF-8，杜绝赛博幽灵
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

if __name__ == "__main__":
    try:
        engine = ParserEngine()
        path = engine.select_file()
        if path:
            print(path) # 回传路径给 Electron
        else:
            print("CANCELLED")
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)
