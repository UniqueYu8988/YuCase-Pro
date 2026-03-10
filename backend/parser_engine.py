import docx
import re
import os
import tkinter as tk
from tkinter import filedialog
import sys
import io

# v7.8: Safe UTF-8 reconfiguration for Windows console stability
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

class ParserEngine:
    def select_file(self):
        """弹出 Windows 标准文件选择框"""
        root = tk.Tk()
        root.withdraw() 
        root.attributes('-topmost', True)
        file_path = filedialog.askopenfilename(
            title="选择病历原件 (YuCase Medical)",
            filetypes=[("病历文件", "*.docx *.txt"), ("所有文件", "*.*")]
        )
        root.destroy()
        return file_path

    def parse_file(self, file_path, rules):
        try:
            doc = docx.Document(file_path)
            
            # Royal Security: Directly extract all text nodes by physical order
            # 这种写法绝对不会触发对象报错，还能完美保留 10 份病历的顺序！
            text_list = []
            for node in doc.element.body.iter():
                # 提取底层 <w:t> 标签内的纯文本
                if str(node.tag).endswith('t') and node.text:
                    text_list.append(node.text)
            
            full_text = " ".join(text_list)

            # Cyber Wash: Clean up format impurities
            clean_text = re.sub(r'[\n\t\u3000\r]+', ' ', full_text)
            clean_text = re.sub(r'\s+', ' ', clean_text)
            
            # v6.6 Character Reduction: Map circled numbers to digits
            circle_map = str.maketrans('①②③④⑤⑥⑦⑧⑨', '123456789')
            clean_text = clean_text.translate(circle_map)

            # Case Sensitivity Fix: Full-width decimal point replacement
            clean_text = re.sub(r'[。．]', '.', clean_text)

            # ✂️ 切分病历
            chunks = re.split(r'(?=医疗机构[：:])', clean_text)
            
            parsed_records = []
            for chunk in chunks:
                if len(chunk.strip()) < 100: 
                    continue
                
                extracted_data = {}
                error_details = []
                has_empty = False
                
                for rule in rules:
                    key = rule['key']
                    pattern = rule.get('regex', '')
                    
                    # Royal Tolerance: Skip empty regex or fixed items
                    if not pattern or rule.get('isFixed'):
                        extracted_data[key] = ""
                        continue

                    # Financial Grade Capture: Allow internal spaces
                    if "费" in key or "金额" in key:
                        pattern = r'([0-9\s]+(?:[\.．。][0-9\s]+)?)'
                        # 在原始 key 的后面寻找这个模式
                        full_pattern = rule['regex'].replace(r'([0-9]+\.?[0-9]*)', pattern).replace(r'[\d\.]+', pattern)
                        match = re.search(full_pattern, chunk)
                    else:
                        match = re.search(pattern, chunk)
                        
                    if match:
                        val = match.group(1).strip()
                        
                        # v4.5/v4.6 Ultimate Purification
                        val = val.replace(" ", "")
                        if "日期" not in key and "时间" not in key:
                            val = re.sub(r'[-—_]+', '', val)

                        # 费用类深度清洗：剔除所有内部空格，统一小数点
                        if "费" in key or "金额" in key:
                            val = re.sub(r'\s+', '', val).replace('。', '.').replace('．', '.')
                            # v4.3.1 Physical Truncation Patch
                            trunc_match = re.search(r'([0-9]+\.?[0-9]{0,2})', val)
                            if trunc_match:
                                val = trunc_match.group(1)
                            
                        if rule.get('mapping') and val in rule['mapping']:
                            val = rule['mapping'][val]
                        extracted_data[key] = val
                    else:
                        extracted_data[key] = ""
                
                # 🛡️ 逻辑同步：克隆去空战术 (地址与电话)
                # 1. 地址同步
                addr_keys = ['现住址', '户口地址', '联系人地址']
                addrs = [extracted_data.get(k, "") for k in addr_keys if extracted_data.get(k)]
                if addrs:
                    best_addr = max(addrs, key=len).replace(' ', '')
                    for k in addr_keys: extracted_data[k] = best_addr
                
                # 2. 电话同步
                phone_keys = ['患者电话', '联系人电话']
                phones = [extracted_data.get(k, "") for k in phone_keys if extracted_data.get(k)]
                if phones:
                    best_phone = max(phones, key=len).replace(' ', '')
                    for k in phone_keys: extracted_data[k] = best_phone

                # 👑 v6.9 语义洗碗机：关系标准化 (修正键名为 "关系")
                rel_val = extracted_data.get('关系', '')
                if rel_val:
                    REL_MAP = {
                        "本人或户主": ["本人", "自己", "户主", "患儿"],
                        "配偶": ["配偶", "夫", "妻", "老公", "老婆", "爱人", "对象"],
                        "子": ["子", "儿子", "长子", "次子", "男孩"],
                        "女": ["女", "女儿", "长女", "次女", "女孩"],
                        "孙子、孙女或外孙子、外孙女": ["孙", "外孙", "孙子", "孙女"],
                        "父母": ["父", "母", "爸", "妈", "爹", "娘", "父亲", "母亲"],
                        "祖父母或外祖父母": ["爷", "奶", "外公", "外婆", "祖父", "祖母"],
                        "兄、弟、姐、妹": ["哥", "弟", "姐", "妹", "兄"]
                    }
                    found_mapping = False
                    for standard, keywords in REL_MAP.items():
                        if any(kw in rel_val for kw in keywords):
                            extracted_data['关系'] = standard
                            found_mapping = True
                            break
                    if not found_mapping:
                        extracted_data['关系'] = "其他"

                # 👑 v6.7 内容预警雷达：扫描是否存在“其他诊断”
                extracted_data['has_other_diagnosis'] = "其他诊断" in chunk

                # 🛡️ v4.6 时序重构：在补全逻辑后，再进行全量缺失值质检
                for k, v in extracted_data.items():
                    if not v and k != "has_error" and k != "error_details":
                        has_empty = True
                        error_details.append(f"缺失字段 [{k}]")

                # 👑 v4.7 绝对真理覆盖：门诊诊断 -> 疾病编码 强制对齐
                DISEASE_MAP = {
                    '精神分裂症': 'F20.900',
                    '精神发育迟缓，需要加以关注或治疗的显著行为缺陷': 'F79.100',
                    '双相情感障碍': 'F31.900'
                }
                diag = extracted_data.get('门诊诊断', '')
                for name, code in DISEASE_MAP.items():
                    if name in diag:
                        extracted_data['疾病编码'] = code
                        break
                
                # 👑 v7.22 强行拦截：付款方式 02 (物理级固定协议)
                # 无论前面正则抓到了什么，只要存在这个键，强行覆盖为 '02'
                if '付款方式' in extracted_data:
                    extracted_data['付款方式'] = '02'

                # 💰 皇家财务对账系统：9 大费用求和校验
                try:
                    fee_components = [
                        '一般治疗费', '护理费', '其他费用', '实验室诊断费', 
                        '影像学诊断费', '西药费', '中成药费', '中草药费', '其他费'
                    ]
                    comp_sum = sum(float(extracted_data.get(k) or 0) for k in fee_components)
                    total_fee = float(extracted_data.get('总费用') or 0)
                    
                    diff = abs(comp_sum - total_fee)
                    
                    # 👑 v4.7 审计验真：在 Stderr 打印校验痕迹，证明系统未装死
                    import sys
                    sys.stderr.write(f"[Audit] 病案号 {extracted_data.get('病案号', '未知')}: 求和 {comp_sum:.2f}, 总计 {total_fee:.2f}, 误差 {diff:.4f}\n")

                    # 👑 v6.9 财务雷达：误差 >= 0.01 触发橙色预警
                    extracted_data["has_fee_error"] = diff >= 0.01
                    if diff > 0.05:
                        error_details.append(f"总费用账目严重不平 (误差 {diff:.2f})")
                except Exception as e:
                    import sys
                    sys.stderr.write(f"[Audit Error] {str(e)}\n")

                # ⚠️ 注入预警元数据 (不参与 UI 卡片渲染)
                extracted_data["has_error"] = has_empty
                extracted_data["error_details"] = [f"病案号 {extracted_data.get('病案号', '未知')}: {e}" for e in error_details]

                # 🛡️ 终极防线：只有抓到姓名和病案号才算合法病历
                if extracted_data.get('姓名') and extracted_data.get('病案号'):
                    parsed_records.append(extracted_data)
                    
            return parsed_records
            
        except Exception as e:
            # 🚨 绝对闭嘴原则：哪怕报错，也只返回空列表，坚决不 print 任何破坏 JSON 的废话！
            return []