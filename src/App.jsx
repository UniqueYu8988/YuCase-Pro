import React, { useState, useEffect, useRef } from 'react';
import { Upload, Info, List, Play, X, Minus, Square, ChevronLeft, AlertCircle, GripVertical, Plus, Save } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const FIXED_FIELDS = [
  { key: '病案质量', val: '甲' },
  { key: '中医诊疗', val: '是' },
  { key: '离院方式', val: '医嘱离院' },
  { key: '国籍', val: 'CHN 中国' },
  { key: '入院途径', val: '门诊' },
  { key: '入院病情', val: '有' }
];

const App = () => {
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [parsedRecords, setParsedRecords] = useState([]); // 数组形式支持多份
  const [expandedIndex, setExpandedIndex] = useState(null); // 当前展开的索引
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [isFilling, setIsFilling] = useState(false);
  const [sequence, setSequence] = useState([]); // 250项序列状态
  const [speed, setSpeed] = useState(1); // 1x, 2x, 4x, 8x
  const [systemState, setSystemState] = useState('IDLE'); // IDLE, ARMED, FILLING
  const [showFinale, setShowFinale] = useState(false); // v7.11: 皇家紫耀终结篇
  
  // v7.16: 为 IPC 监听器提供最新数据的引用，解决陈旧闭包 (Stale Closure)
  const parsedRecordsRef = useRef(parsedRecords);
  const expandedIndexRef = useRef(expandedIndex);

  useEffect(() => {
    parsedRecordsRef.current = parsedRecords;
  }, [parsedRecords]);

  useEffect(() => {
    expandedIndexRef.current = expandedIndex;
  }, [expandedIndex]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // v6.5: 不死鸟自动存档 - 监听序列变化并实时同步
  useEffect(() => {
    if (sequence.length > 0) {
      // 仅存储物理结构，过滤掉瞬态 ID 偏差 (使用稳定 ID 或纯数据)
      localStorage.setItem('yucase_sequence_draft', JSON.stringify(sequence));
    }
  }, [sequence]);

  useEffect(() => {
    window.electronAPI?.getRules().then(data => {
      setRules(data);
      
      // 🛡️ v6.5: 战备恢复 - 优先加载本地排版草稿
      const draft = localStorage.getItem('yucase_sequence_draft');
      if (draft) {
        try {
          const parsedDraft = JSON.parse(draft);
          if (Array.isArray(parsedDraft) && parsedDraft.length > 0) {
            setSequence(parsedDraft);
            return;
          }
        } catch (e) {
          console.warn("[不死鸟] 存档损坏，执行默认初始化流程");
        }
      }
      
      const fixedKeys = new Set(FIXED_FIELDS.map(f => f.key));
      
      // 1. 初始化 250 格空位
      let initialSeq = Array.from({ length: 250 }, (_, i) => ({
        id: `slot-${i}-${Date.now()}`,
        ruleKey: null,
        sourceId: null
      }));

      // 2. 将 rules.json 中的正则项按 index 归位
      data.filter(r => !fixedKeys.has(r.key)).forEach(rule => {
        const indices = Array.isArray(rule.index) ? rule.index : [rule.index];
        indices.forEach(idx => {
          if (idx >= 0 && idx < 250) {
            initialSeq[idx] = {
              id: `rule-${rule.key}-${idx}-${Date.now()}`,
              ruleKey: rule.key,
              sourceId: Array.isArray(rule.index) ? rule.index.join('&') : rule.index
            };
          }
        });
      });

      // 3. 强行在最前方注入 6 大保送生 (内存 unshift 战术)
      const fixedInjections = FIXED_FIELDS.map((f, i) => ({
        id: `fixed-${f.key}-${Date.now()}`,
        ruleKey: f.key,
        sourceId: 'FIXED'
      }));

      // 先移除 sequence 中可能已经存在的这些固定 key (防止重复)
      let cleanedSeq = initialSeq.filter(item => !fixedKeys.has(item.ruleKey));
      
      // 强行插入前 6 位
      let finalSeq = [...fixedInjections, ...cleanedSeq];
      
      // 4. v6.5: 动态补全末位追加 (其他费)
      const otherFeeRule = data.find(r => r.key === '其他费用' || r.key === '其他费');
      if (otherFeeRule) {
        // 检查是否已经在序列中，如果不在则强制推入末尾
        if (!finalSeq.some(item => item.ruleKey === otherFeeRule.key)) {
          finalSeq.push({
            id: `append-${otherFeeRule.key}-${Date.now()}`,
            ruleKey: otherFeeRule.key,
            sourceId: Array.isArray(otherFeeRule.index) ? otherFeeRule.index.join('&') : otherFeeRule.index
          });
        }
      }
      
      setSequence(finalSeq);
    });
  }, []);

  // v7.10: 纯原生 Web Audio API 高级晶体音效
  const playSuccessChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      // v7.13: 皇家增益 - 提升音量至 0.8
      gain.gain.setValueAtTime(0.8, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error("Audio playback blocked or failed", e);
    }
  };

  // v7.11: 胜利和弦合成器
  const playFinaleChord = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playNote = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle'; // 晶莹剔透的三角波
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, startTime);
        // v7.13: 皇家增益 - 提升音量至 0.8
        gain.gain.linearRampToValueAtTime(0.8, startTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = ctx.currentTime;
      // 播放 A 大调胜利分解和弦
      playNote(440.00, now, 1.0);       // A4
      playNote(554.37, now + 0.15, 1.0); // C#5
      playNote(659.25, now + 0.3, 1.0);  // E5
      playNote(880.00, now + 0.45, 2.0); // A5 (华丽长余响)
    } catch (e) {
      console.error("Finale audio failed", e);
    }
  };

  useEffect(() => {
    // v7.15: 唯一真理：白皮书标准 IPC 频道监听
    window.electronAPI?.onFillingStateUpdate((channel, data) => {
      console.log(`%c[IPC Signal] ${channel}`, "color: #a855f7; font-weight: bold; padding: 2px 4px;");
      
      switch(channel) {
        case 'engine-armed':
          setSystemState('ARMED');
          break;
        case 'engine-filling':
          setSystemState('FILLING');
          break;
        case 'single-patient-done':
          // 不要在这里设置 ARMED，由 handleSingleDone 处理逻辑
          handleSingleDone();
          break;
        case 'engine-stopped':
          setSystemState('IDLE');
          break;
        default:
          break;
      }
    });

    // v7.24: 皇家全局引导协议 - F8 启动信号 (来自 Electron 主进程 globalShortcut)
    window.electronAPI?.onGlobalF8Trigger(() => {
      console.log("🎹 [IPC BUGLE] 收到全局 F8 击发信号，正在上膛...");
      const btn = document.querySelector('button.royal-shadow');
      if (btn && !btn.disabled) {
        btn.click(); // 物理模拟点击，避开闭包陈旧问题
      }
    });

    // v7.21: 致命 Bug 熔断协议 - 监听病历切换
    // 如果在 ARMED/FILLING 状态下手动切换了病历，立刻强杀旧引擎防止填错
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (systemState === 'ARMED' || systemState === 'FILLING') {
      console.warn("⚠️ [状态熔断] 检测到病历切换，正在强杀旧引擎以防填报失步...");
      window.electronAPI?.invokePython({ action: 'STOP_FILLING' });
      setSystemState('IDLE');
      setLogs(prev => [...prev, "🛑 [安全熔断] 检测到索引变更，旧引擎已强制下线。"]);
    }
    // 注意：只在索引确实发生有效变化时触发
  }, [expandedIndex]);

  // v7.24: F8 已迁移至 Electron 主进程全局快捷键 (globalShortcut)
  // 渲染进程不再需要本地 keydown 监听，由主进程 IPC 驱动进度

  const handleSingleDone = () => {
    const currentRecords = parsedRecordsRef.current;
    const currentIdx = expandedIndexRef.current;
    const hasNext = (currentIdx !== null) && (currentIdx < currentRecords.length - 1);

    playSuccessChime();

    if (hasNext) {
      // 1. 还没填完：仅切换索引，UI 回归 IDLE，等待手动装弹
      const nextIdx = currentIdx + 1;
      setLogs(prev => [...prev, `✅ [单兵完成] 已就绪下一位患者: ${currentRecords[nextIdx].姓名 || ''}`]);
      
      setExpandedIndex(nextIdx);
      setSystemState('IDLE'); // 关键：回归 IDLE，不再自动 START_FILLING
    } else {
      // 2. 全量终结：触发终极彩蛋！
      setLogs(prev => [...prev, "🏁 [任务终结] 已完成全量列表，恭喜前辈！"]);
      playFinaleChord();
      setShowFinale(true);
      setTimeout(() => setShowFinale(false), 8000); 
      setSystemState('IDLE');
    }
  };

  // v7.19: 彻底删减 FEED 流程，装弹逻辑合并入 handleAction

  const handleAction = async (action, forcedIndex = null) => {
    if (action === 'START_FILLING') {
      // v7.19: 无论如何，启动前先重置状态
      const targetIndex = forcedIndex !== null ? forcedIndex : expandedIndex;

      if (targetIndex === null) {
        setLogs(["请先选择一份病案！"]);
        return;
      }
      
      const record = parsedRecords[targetIndex];
      const fillList = sequence.map(slot => {
        if (!slot.ruleKey) return "";
        return record[slot.ruleKey] || "";
      });

      setLogs([
        `🚀 [引擎唤醒] 正在锁定: ${record.姓名 || '未知'}`,
        "常驻引擎启动中，待命后请按下 F9..."
      ]);

      // 首次唤醒
      await window.electronAPI?.invokePython({ 
          action, 
          data: { fillList, speed }
      });
      return;
    }

    const res = await window.electronAPI?.invokePython({ 
        action, 
        data: expandedIndex !== null ? parsedRecords[expandedIndex] : {}, 
        filePath: currentPath 
    });
    
    if (res?.success) {
      if (action === 'IMPORT_FILE') {
        setCurrentPath(res.path);
        
        // 🛡️ v6.9: 预警雷达静默协议 - 过滤保送生与所有内部判定标记
        const WHITELIST = ['病案质量', '中医诊疗', '离院方式', '国籍', '入院途径', '入院病情', 'has_other_diagnosis', 'has_fee_error'];
        
        // v6.1: 纯前端保送生注入
        const enrichedData = (res.parsedData || []).map(record => {
          const newRecord = { ...record };
          FIXED_FIELDS.forEach(f => {
            newRecord[f.key] = f.val;
          });
          
          // 重新校准错误详情：移除白名单内的报错
          if (newRecord.error_details) {
            newRecord.error_details = newRecord.error_details.filter(err => {
              return !WHITELIST.some(w => err.includes(w));
            });
            newRecord.has_error = newRecord.error_details.length > 0;
          }
          
          return newRecord;
        });
        
        setParsedRecords(enrichedData);
        setExpandedIndex(enrichedData.length > 0 ? 0 : null);
        
        // 🚨 智能提醒：仅汇总过滤后的错误详情
        const allErrors = enrichedData.flatMap(r => r.error_details || []);
        setLogs(allErrors);
      }
    } else if (res?.message) {
      setLogs([`警告: ${res.message}`]);
    }
  };

  const updateRule = (key, newRegex) => {
    const nextRules = rules.map(r => r.key === key ? { ...r, regex: newRegex } : r);
    setRules(nextRules);
    window.electronAPI?.saveRules(nextRules);
  };

  // v5.3: 同步序列变更回 rules.json
  const saveSequenceOrder = () => {
    const updatedRules = rules.map(rule => {
      // 在 sequence 中找到所有 ruleKey 匹配的项，收集它们的当前索引
      const newIndices = sequence
        .map((item, idx) => item.ruleKey === rule.key ? idx : -1)
        .filter(idx => idx !== -1);
      
      if (newIndices.length === 0) return rule;
      return {
        ...rule,
        index: newIndices.length === 1 ? newIndices[0] : newIndices
      };
    });
    setRules(updatedRules);
    window.electronAPI?.saveRules(updatedRules);
    setLogs(["皇家填报序列保存成功！"]);
  };

  // v5.4: 删除序列项逻辑 (仅限空项)
  const deleteSequenceItem = (id) => {
    setSequence(prev => prev.filter(item => item.id !== id));
  };

  // v5.4: 插入序列项逻辑
  const insertSequenceItem = (index) => {
    const newSeq = [...sequence];
    newSeq.splice(index + 1, 0, { id: `slot-new-${Date.now()}`, ruleKey: null, sourceId: null });
    setSequence(newSeq);
  };

  return (
    <div className="window-container royal-root relative flex flex-row overflow-hidden">
      {/* 核心主体 */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 overflow-hidden">
        <div className="title-bar h-10 flex items-center justify-between px-4 bg-white/5 drag-region shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-black tracking-[0.2em] text-royal-purple/90 italic">YUCASE PRO</span>
            <div className="h-2.5 w-[1px] bg-white/10" />
            <span className="text-[9px] text-white/30 uppercase font-black tracking-widest">Medical Intelligence</span>
          </div>
          <div className="flex gap-4 no-drag relative z-[999]">
            <Minus className="w-4 h-4 cursor-pointer hover:text-royal-purple transition-colors escape-hatch" onClick={() => window.electronAPI?.windowMin()} />
            <X className="w-4 h-4 cursor-pointer hover:text-red-500 transition-colors escape-hatch" onClick={() => window.electronAPI?.windowClose()} />
          </div>
        </div>

        <main className="flex-1 p-5 flex flex-col gap-4 overflow-hidden fadeIn">
          {/* 进度条 */}
          {isFilling && (
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden shrink-0">
              <div 
                className="h-full bg-royal-purple shadow-[0_0_10px_#a855f7] transition-all duration-300" 
                style={{ width: `${(progress / 250) * 100}%` }}
              />
            </div>
          )}

          <header className="flex justify-between items-center px-1 shrink-0">
            <div className="flex flex-col">
              <h1 className="text-[14px] font-black tracking-widest text-royal-purple/90 italic uppercase">
                  YUCASE PRO
              </h1>
              <div className="flex gap-1.5 mt-0.5">
                {[1, 2, 4, 8].map(s => (
                  <button 
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded transition-all border ${speed === s ? 'bg-royal-purple/20 border-royal-purple text-royal-purple' : 'bg-white/5 border-white/5 text-white/20 hover:text-white/40'}`}
                  >
                    x{s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsMatrixOpen(!isMatrixOpen)}
                className={`p-1.5 rounded-item transition-all no-drag ${isMatrixOpen ? 'bg-royal-purple text-white shadow-[0_0_15px_#a855f744]' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                title="填报序列矩阵"
              >
                <List size={16} />
              </button>
              <button 
                onClick={() => setIsConfigOpen(!isConfigOpen)}
                className={`p-1.5 rounded-item transition-all no-drag ${isConfigOpen ? 'bg-royal-purple text-white shadow-[0_0_15px_#a855f744]' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                title="规则查阅"
              >
                <Info size={16} />
              </button>
            </div>
          </header>

          {/* 导入区块 */}
          <section 
            onClick={() => handleAction('IMPORT_FILE')}
            className="group cursor-pointer p-4 border border-white/10 hover:border-royal-purple/40 rounded-item flex items-center gap-4 transition-all hover:bg-white/[0.08] relative overflow-hidden shrink-0"
          >
            <div className="p-2.5 rounded-full bg-royal-purple/10">
                <Upload className="text-royal-purple w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white/80">点击此处上传文档</div>
              <div className="text-white/20 text-[9px] truncate">
                {currentPath ? currentPath.split(/[\\/]/).pop() : "Medical Case Intelligence System"}
              </div>
            </div>
            {currentPath && <div className="text-royal-purple scale-75 animate-pulse"><Play size={14} fill="currentColor" /></div>}
          </section>

          {/* 手风琴列表 & 预览墙 */}
          <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1">
              {parsedRecords.map((record, index) => (
                <div key={index} className="flex flex-col gap-2 shrink-0">
                  {/* 条目 Header */}
                  <div 
                    onClick={(e) => {
                      const newIndex = expandedIndex === index ? null : index;
                      setExpandedIndex(newIndex);
                      if (newIndex !== null) {
                        const target = e.currentTarget;
                        setTimeout(() => {
                          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 150);
                      }
                    }}
                    className={`p-3 rounded-item border flex items-center justify-between cursor-pointer transition-all ${expandedIndex === index ? 'bg-royal-purple/10 border-royal-purple/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${expandedIndex === index ? 'bg-royal-purple animate-pulse' : 'bg-white/20'}`} />
                      <div className="text-[11px] font-bold text-white/70 flex items-center gap-2">
                        {record.病案号 || "无案号"} | {record.姓名 || "未定位姓名"}
                        <div className="flex items-center gap-1 ml-1">
                          {record.has_error && (
                            <AlertCircle size={10} className="text-red-500 animate-pulse" title="存在缺失字段" />
                          )}
                          {record.has_other_diagnosis && (
                            <AlertCircle size={10} className="text-yellow-500 animate-pulse" title="内容预警：存在其他诊断" />
                          )}
                          {record.has_fee_error && (
                            <AlertCircle size={10} className="text-orange-500 animate-pulse" title="财务预警：账目核算不平" />
                          )}
                          {record.关系 === '其他' && (
                            <AlertCircle size={10} className="text-green-500 animate-pulse" title="语义安全降级：关系为其他" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-white/20">
                      {expandedIndex === index ? <Minus size={12} /> : <Play size={10} className="rotate-90" />}
                    </div>
                  </div>

                  {/* 展开的预览墙 */}
                  {expandedIndex === index && (
                    <div className="grid grid-cols-2 gap-2 p-1 animate-fadeIn">
                      {Object.entries(record)
                        .filter(([key]) => !['has_error', 'error_details', 'has_other_diagnosis', 'has_fee_error'].includes(key))
                        .map(([key, val]) => (
                        <div 
                          key={key} 
                          className={`p-2.5 rounded-item border transition-all flex flex-col gap-0.5 ${val ? 'bg-white/5 border-white/5' : 'bg-red-500/10 border-red-500/20 shadow-[inset_0_0_8px_rgba(239,68,68,0.1)]'}`}
                        >
                          <div className="text-[9px] font-bold text-white/50 flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <span>{key}</span>
                              {key === '关系' && val === '其他' && (
                                <AlertCircle size={10} className="text-green-500 animate-pulse" title="语义安全降级：其他" />
                              )}
                              {(key === '主要诊断' || key === '主要诊断名称') && record.has_other_diagnosis && (
                                <AlertCircle size={10} className="text-yellow-500 animate-pulse" title="注意：全文含“其他诊断”" />
                              )}
                              {key === '总费用' && record.has_fee_error && (
                                <AlertCircle size={10} className="text-orange-500 animate-pulse" title="财务雷达：账目核算不平" />
                              )}
                            </div>
                            {!val && <span className="text-red-400 text-[7px] font-black uppercase tracking-tighter">NULL</span>}
                          </div>
                          <div className={`text-[10px] font-medium break-all ${val ? (key === '关系' && val === '其他' ? 'text-green-500/80' : 'text-royal-purple/90') : 'text-white/5 italic'}`}>
                              {val || "未检出"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {parsedRecords.length === 0 && !currentPath && (
                <div className="h-full flex flex-col items-center justify-center text-white/5 gap-3">
                    <div className="w-10 h-10 border-2 border-dashed border-white/5 rounded-full" />
                    <div className="text-[10px] uppercase font-black tracking-[0.3em] font-cursive italic">Always here for Y💍U</div>
                </div>
              )}
            </div>
          </div>

          {/* v7.0 智能预警雷达与审核状态 */}
          <div className="p-3 bg-black/60 rounded-item border border-white/5 text-[9px] text-royal-purple/90 h-[105px] flex flex-col gap-1 shrink-0 overflow-y-auto no-scrollbar leading-relaxed relative group">
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-tight mb-1 border-b border-white/5 pb-1 flex justify-between sticky top-0 bg-geek-dark/80 backdrop-blur-sm z-10 transition-colors">
              <span className="tracking-widest">智能提醒</span>
              <span className="text-[9px] font-black">{logs.length} Issues Found</span>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              {logs.length > 0 ? logs.map((log, i) => (
                <div key={i} className={`whitespace-normal break-all font-mono ${log.includes('对账') || log.includes('校验') ? 'text-red-400 font-bold' : (log.includes('连发') ? 'text-green-400 animate-pulse' : 'opacity-60')}`}>
                  • {log}
                </div>
              )) : (currentPath && (
                <div className="h-full flex flex-col items-center justify-center animate-fadeIn py-2 translate-y-[-4px]">
                  {expandedIndex === parsedRecords.length - 1 && logs.length === 0 && !isArmed ? (
                    <>
                      <div className="text-yellow-500 text-[20px] font-black tracking-[0.1em] italic uppercase drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">全量终结</div>
                      <div className="text-[9px] text-yellow-500/40 tracking-[0.3em] font-black uppercase mt-[-2px]">ALL CLEARED</div>
                    </>
                  ) : (
                    <>
                      <div className="text-royal-purple/40 text-[18px] font-black tracking-[0.2em] italic uppercase">审核通过</div>
                      <div className="text-[8px] text-white/20 tracking-[0.5em] font-black uppercase mt-[-2px]">APPROVED</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <footer className="shrink-0">
            <button 
              onClick={() => handleAction('START_FILLING')}
              className={`w-full h-12 text-white font-black rounded-item royal-shadow flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${systemState !== 'IDLE' ? 'bg-royal-purple animate-pulse' : 'bg-royal-purple hover:bg-royal-purple/80'} ${expandedIndex === null ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
              disabled={expandedIndex === null}
            >
              <Play size={14} className={systemState === 'FILLING' ? 'fill-current animate-spin-slow' : 'fill-current'} />
              <span className="tracking-widest uppercase text-[11px]">
                {systemState === 'IDLE' && "极速填报"}
                {systemState === 'ARMED' && "请按下 F9"}
                {systemState === 'FILLING' && "自动填报中"}
              </span>
            </button>
          </footer>
        </main>
      </div>

      {/* v7.11: 绝美皇家紫耀终结篇 */}
      {showFinale && (
        <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/60 backdrop-blur-2xl animate-fadeIn pointer-events-none">
          <div className="text-royal-purple text-6xl font-black italic tracking-widest drop-shadow-[0_0_20px_rgba(168,85,247,0.8)] animate-pulse-slow uppercase">
            全量终结
          </div>
          <div className="text-royal-purple/50 text-xl font-bold tracking-[0.6em] mt-3 drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]">
            ALL CLEARED
          </div>
        </div>
      )}

      {/* 皇家序列控制台 (250 项) - v5.4 UI Refactor */}
      <div 
        className={`transition-all duration-500 ease-in-out border-l border-white/10 bg-black/90 backdrop-blur-3xl overflow-hidden flex flex-col absolute right-0 h-full z-[110] ${isMatrixOpen ? 'w-[320px] opacity-100' : 'w-0 opacity-0 border-none pointer-events-none'}`}
      >
        <div className="p-0 h-full flex flex-col min-w-[320px]">
          {/* v7.0 Header - 序列引擎与中文副标 */}
          <div className="pt-8 pb-6 px-6 flex justify-between items-center shrink-0 border-b border-white/5">
            <div className="flex items-center gap-3">
              <button 
                onClick={saveSequenceOrder}
                className="w-8 h-8 flex items-center justify-center bg-royal-purple/20 border border-royal-purple/30 rounded-full hover:bg-royal-purple text-white transition-all no-drag escape-hatch group"
                title="保存序列"
              >
                <Save size={14} className="group-hover:scale-110 transition-transform" />
              </button>
              <button 
                onClick={() => setIsMatrixOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-full hover:bg-red-500/20 hover:border-red-500/40 text-white/40 hover:text-red-400 transition-all no-drag escape-hatch group"
                title="关闭"
              >
                <X size={14} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>
            <div className="flex flex-col items-end">
              <h2 className="text-[10px] font-black text-royal-purple/40 tracking-[0.3em] uppercase italic">Sequence Engine</h2>
              <span className="text-[9px] font-bold text-white/60 tracking-[0.1em]">序列引擎</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-4 pb-20">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => {
                const { active, over } = event;
                if (active.id !== over.id) {
                  setSequence((items) => {
                    const oldIndex = items.findIndex(item => item.id === active.id);
                    const newIndex = items.findIndex(item => item.id === over.id);
                    return arrayMove(items, oldIndex, newIndex);
                  });
                }
              }}
            >
              <SortableContext items={sequence} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1.5 pb-20">
                  {(() => {
                    const rendered = [];
                    for (let i = 0; i < sequence.length; i++) {
                      const current = sequence[i];
                      
                      // 检查连续空项折叠逻辑 (3个及以上)
                      if (!current.ruleKey) {
                        let j = i;
                        while (j + 1 < sequence.length && !sequence[j+1].ruleKey) {
                          j++;
                        }
                        const count = j - i + 1;
                        if (count >= 3) {
                          const foldedId = `folded-${sequence[i].id}`;
                          rendered.push(
                            <div key={foldedId} className="p-3 bg-white/5 border border-dashed border-white/10 rounded-item flex items-center justify-between group/folded transition-all hover:bg-white/[0.08]">
                              <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                                <span className="text-[11px] font-bold text-white/30 italic">占位 (空间已折叠)</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <button 
                                  onClick={() => deleteSequenceItem(sequence[i].id)}
                                  className="w-6 h-6 flex items-center justify-center bg-red-500/20 text-red-400 rounded-full opacity-0 group-hover/folded:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                  title="移除一个空位"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="text-xl font-black italic text-royal-purple/30 tracking-widest pr-2 group-hover/folded:text-royal-purple/70 transition-all">
                                  x {count}
                                </span>
                              </div>
                            </div>
                          );
                          i = j; // 跳过已折叠项
                          continue;
                        }
                      }
                      
                      // 正常渲染
                      rendered.push(
                        <SortableItem 
                          key={current.id} 
                          id={current.id} 
                          index={i} 
                          item={current} 
                          onInsert={() => insertSequenceItem(i)}
                          onDelete={() => deleteSequenceItem(current.id)}
                        />
                      );
                    }
                    return rendered;
                  })()}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>

      {/* 皇家规则查阅面板 - v5.5 Header Sync */}
      <div 
        className={`transition-all duration-500 ease-in-out border-l border-white/10 bg-black/90 backdrop-blur-3xl overflow-hidden flex flex-col absolute right-0 h-full z-[100] ${isConfigOpen ? 'w-[320px] opacity-100' : 'w-0 opacity-0 border-none pointer-events-none'}`}
      >
        <div className="p-0 h-full flex flex-col min-w-[320px]">
          {/* v7.0 Header - 正则字库与中文副标 */}
          <div className="pt-8 pb-6 px-6 flex justify-between items-center shrink-0 border-b border-white/5">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsConfigOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-full hover:bg-royal-purple/20 hover:border-royal-purple/40 text-white/40 hover:text-royal-purple transition-all no-drag escape-hatch group"
                title="返回"
              >
                <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
              <button 
                onClick={() => setIsConfigOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-white/5 border border-white/10 rounded-full hover:bg-red-500/20 hover:border-red-500/40 text-white/40 hover:text-red-400 transition-all no-drag escape-hatch group"
                title="关闭"
              >
                <X size={14} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>
            <div className="flex flex-col items-end">
              <h2 className="text-[10px] font-black text-royal-purple/40 tracking-[0.3em] uppercase italic">Regex Library</h2>
              <span className="text-[9px] font-bold text-white/60 tracking-[0.1em]">正则字库</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-4 pb-20 space-y-4">
            {/* 👑 v7.0 四色预警图例 */}
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-item space-y-2.5">
              <div className="text-[10px] font-black text-royal-purple/40 tracking-widest uppercase italic border-b border-white/5 pb-1.5 mb-2">四色预警图例</div>
              <div className="flex items-start gap-3">
                <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-red-400">红色感叹号：致命缺失</span>
                  <span className="text-[9px] text-white/30 leading-tight text-justify">原始病历中未提取到目标字段，填报时将留空，建议立即人工干预。</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle size={14} className="text-yellow-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-yellow-400">黄色感叹号：内容预警</span>
                  <span className="text-[9px] text-white/30 leading-tight text-justify">全文检测到“其他诊断”字样，提醒人工留意是否存在额外诊断。</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle size={14} className="text-orange-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-orange-400">橙色感叹号：财务预警</span>
                  <span className="text-[9px] text-white/30 leading-tight text-justify">各项费用加总与【总费用】误差 ≥ 0.01，提醒人工核对账目金额。</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle size={14} className="text-green-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-green-400">绿色感叹号：安全降级</span>
                  <span className="text-[9px] text-white/30 leading-tight text-justify">联系人关系非常规（如：爱人、长子），已由系统自动安全映射为“其他”。</span>
                </div>
              </div>
            </div>

            {rules && rules.length > 0 ? rules.map(rule => (
              <div key={rule.key} className="p-3 bg-white/5 rounded-item border border-white/10">
                <div className="text-[9px] font-bold text-white/40 mb-1 uppercase tracking-tight">{rule.key}</div>
                <div className="bg-black/40 rounded px-2 py-1.5 text-[9px] font-mono text-royal-purple/70 break-all border border-white/5 select-text">
                  {rule.regex}
                </div>
              </div>
            )) : (
              <div className="text-[10px] text-white/20 italic p-10 text-center">Loading documentation...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 排序组件 v5.6 - 绝对单一序列与视觉纠偏
const SortableItem = ({ id, index, item, onInsert, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
  };

  // v5.6: 格式化锚点显示 (搬家到主坐标系旁边)
  const formatSourceAnchor = (id) => {
    if (id === 'FIXED') return ''; // 固定项不显示小锚点
    if (id === null || id === undefined) return '';
    const ids = String(id).split('&');
    return ids.map(n => `#${n}`).join(' & ');
  };

  const absIndex = String(index + 1).padStart(3, '0');
  const isFixed = item.sourceId === 'FIXED';

  return (
    <div ref={setNodeRef} style={style} className="relative group/row">
      <div className={`sequence-row group/row min-h-[52px] ${item.ruleKey ? (isFixed ? 'bg-royal-purple/20 border-royal-purple/50' : 'bg-royal-purple/10 border-royal-purple/30') : 'bg-white/[0.05] border-white/10 opacity-60'} ${isDragging ? 'shadow-2xl brightness-125 z-50 scale-[1.02] bg-royal-purple/20' : ''}`}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* v5.6: 手柄常驻可见 */}
          <div {...attributes} {...listeners} className="drag-handle opacity-40 hover:opacity-100 p-1 shrink-0 transition-opacity">
            <GripVertical size={16} className={`text-white/40 ${isFixed ? 'text-royal-purple/60' : ''}`} />
          </div>
          
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {/* v5.6: 核心字段聚焦 */}
              <span className={`text-sm font-bold truncate tracking-tight transition-all ${item.ruleKey ? (isFixed ? 'text-royal-purple shadow-royal-purple/10 text-[15px]' : 'text-white/95 text-[15px]') : 'text-white/30 italic text-[11px] tracking-widest'}`}>
                {item.ruleKey || "占位"}
              </span>
              
              {/* v7.1: 彻底猎杀多余角标 - 仅保留数据，UI 绝对隐藏 */}
              {item.sourceId !== null && item.sourceId !== undefined && item.sourceId !== 'FIXED' && (
                <span className="hidden">
                  {formatSourceAnchor(item.sourceId)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* v5.6: 右侧唯一绝对序列标号 (#001 - #250 或 #FIXED) */}
        <div className="relative flex items-center pr-2">
            <span className={`text-2xl font-black italic transition-all tracking-widest absolute right-0 pointer-events-none uppercase whitespace-nowrap ${isFixed ? 'text-royal-purple/40 fixed-tag-polish' : (item.ruleKey ? 'text-royal-purple/10 group-hover/row:text-royal-purple/60' : 'text-white/5 group-hover/row:text-white/20')}`}>
              {isFixed ? '#FIXED' : `#${absIndex}`}
            </span>
            
            {/* 悬停操作流 */}
            <div className="opacity-0 group-hover/row:opacity-100 flex items-center gap-1.5 transition-all z-10 translate-x-2 group-hover/row:translate-x-0">
              <button 
                onClick={onInsert}
                className="w-7 h-7 flex items-center justify-center bg-royal-purple rounded-full text-white shadow-lg hover:scale-110 active:scale-95 transition-all"
                title="插入新位"
              >
                <Plus size={14} />
              </button>
              {!item.ruleKey && (
                <button 
                  onClick={onDelete}
                  className="w-7 h-7 flex items-center justify-center bg-red-500 rounded-full text-white shadow-lg hover:scale-110 active:scale-95 transition-all"
                  title="删除空位"
                >
                  <Minus size={14} />
                </button>
              )}
            </div>
        </div>
      </div>
      
      {/* v5.6: 铲除缝隙辅助触发区，保持界面纯净 */}
    </div>
  );
};

export default App;
