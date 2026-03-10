import sys
import json
import base64
import argparse
from parser_engine import ParserEngine
from config_manager import ConfigManager
from auto_filler import AutoFiller

# 👑 v1.1: 终极后端聚合器 (Backend Unified Handler)
# 物理隔离环境下的唯一调度官，负责分发 SELECT / EXTRACT / FILL 任务

def setup_encoding():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')

def handle_select():
    try:
        engine = ParserEngine()
        path = engine.select_file()
        if path:
            print(path)
        else:
            print("CANCELLED")
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

def handle_extract(file_path, rules_path):
    if not file_path:
        print(json.dumps([]))
        return

    config = ConfigManager(config_path=rules_path)
    rules = config.load_rules()
    engine = ParserEngine()
    results = engine.parse_file(file_path, rules)
    print(json.dumps(results if results else [], ensure_ascii=False))

def handle_fill(payload_b64, speed_str):
    try:
        print("[ENGINE_INITIALIZED]")
        sys.stdout.flush()
        
        fill_list_json = base64.b64decode(payload_b64).decode('utf-8')
        fill_list = json.loads(fill_list_json)
        speed = float(speed_str)
        
        filler = AutoFiller(speed_multiplier=speed)
        status = filler.fill_data(fill_list)
        
        if status == "ABORTED":
            print(f"\n[STATUS_JSON]{json.dumps({'status': 'ABORTED'})}[/STATUS_JSON]")
        sys.exit(0)
    except Exception as e:
        print(f"Fatal error in V1.1 Filling Engine: {e}")
        sys.exit(1)

def main():
    setup_encoding()
    
    parser = argparse.ArgumentParser(description="YuCase Pro Backend Engine")
    parser.add_argument("--mode", required=True, choices=["SELECT", "EXTRACT", "FILL"])
    parser.add_argument("--path", help="File path for extraction")
    parser.add_argument("--rules", help="Path to rules.json")
    parser.add_argument("--payload", help="Base64 encoded payload for filling")
    parser.add_argument("--speed", help="Speed multiplier for filling")

    args = parser.parse_args()

    if args.mode == "SELECT":
        handle_select()
    elif args.mode == "EXTRACT":
        handle_extract(args.path, args.rules)
    elif args.mode == "FILL":
        handle_fill(args.payload, args.speed)

if __name__ == "__main__":
    main()
