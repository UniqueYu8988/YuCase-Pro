import json
import os
import sys
import io

# v7.8: Safe UTF-8 reconfiguration for Windows console stability
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

class ConfigManager:
    """Config Manager for rules.json"""
    def __init__(self, config_path='rules.json'):
        self.config_path = config_path
        if not os.path.exists(self.config_path):
            self.save_rules([
                {"id": 1, "name": "姓名", "regex": "姓名[:：]\\s*(\\w+)", "mock_data": "张三"},
                {"id": 2, "name": "性别", "regex": "性别[:：]\\s*([男女])", "mock_data": "男"}
            ])

    def load_rules(self):
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"读取配置失败: {e}", file=sys.stderr)
            return []

    def save_rules(self, rules):
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(rules, f, ensure_ascii=False, indent=4)
            return True
        except Exception as e:
            print(f"保存配置失败: {e}", file=sys.stderr)
            return False

if __name__ == "__main__":
    import sys
    manager = ConfigManager()
    
    # 简单的命令行控制，用于 Electron 调用
    if len(sys.argv) > 1 and sys.argv[1] == "--save":
        try:
            new_rules = json.loads(sys.argv[2])
            success = manager.save_rules(new_rules)
            print(json.dumps({"success": success}))
        except:
            print(json.dumps({"success": False}))
    else:
        # 默认返回所有规则
        print(json.dumps(manager.load_rules(), ensure_ascii=False))
