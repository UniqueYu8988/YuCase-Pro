import sys
import json
import os
from parser_engine import ParserEngine
from config_manager import ConfigManager

# 皇家标准：强制全局 UTF-8 输出，杜绝 Windows 赛博乱码
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def main(file_path):
    if not os.path.exists(file_path):
        print(json.dumps([])) # 沉默金律：失败直接返回空列表
        return

    config = ConfigManager()
    rules = config.load_rules()
    
    engine = ParserEngine()
    # parse_file returns a list of results, we take the first one
    results = engine.parse_file(file_path, rules)
    
    if results:
        print(json.dumps(results, ensure_ascii=False))
    else:
        print(json.dumps([], ensure_ascii=False))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        main(sys.argv[1])
    else:
        print(json.dumps([]))
