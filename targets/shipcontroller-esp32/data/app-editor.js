(function(){
const DEMOS={
  test1:{
    id:'test1',
    label:'Test 1: Button -> Timer -> Relay',
    summary:'Минимальный живой сценарий для проверки editor-first пути: источник, логика и команда.',
    project:['Проект','Main'],
    states:[{id:'main',label:'Main',kind:'root',status:'active',flow:'main_flow'}],
    flows:{
      main_flow:{
        title:'Main flow',
        explain:'Raw вход даёт state, Input Behavior делает click/double/held, latch хранит run request, permissive разрешает цикл, таймер управляет командой.',
        nodes:[
          {id:'src_button',lane:'source',type:'io',title:'Источник сигнала',subtitle:'Raw дискретный вход',outputs:['state'],status:'ready',bindings:{source_signal:'signal:start_button'},params:{source_type:'discrete'}},
          {id:'logic_input_behavior',lane:'logic',type:'processing',title:'Input Behavior',subtitle:'Click / double click / held',inputs:['state'],outputs:['short_press','double_press','held'],status:'ready',params:{debounce_ms:'50'}},
          {id:'logic_run_latch',lane:'logic',type:'policy',title:'Run latch',subtitle:'Click запускает, double click останавливает',inputs:['set','reset'],outputs:['run_enabled'],status:'ready',bindings:{set_source:'node:logic_input_behavior.short_press',reset_source:'node:logic_input_behavior.double_press'}},
          {id:'logic_enable_gate',lane:'logic',type:'policy',title:'Permissive',subtitle:'held -> permissive',inputs:['held'],outputs:['permissive'],status:'ready',bindings:{permissive_source:'node:logic_input_behavior.held'}},
          {id:'logic_timer',lane:'logic',type:'timer',title:'Циклический таймер',subtitle:'run_request + permissive',inputs:['run_request','permissive'],outputs:['active','standby','phase_state','phase_remaining'],status:'ready',bindings:{run_request_source:'node:logic_run_latch.run_enabled',permissive_source:'node:logic_enable_gate.permissive'},params:{profile:'cyclic_timer_v1',on_time_ms:'5000',off_time_ms:'295000',stop_policy:'drop_immediately'}},
          {id:'out_relay',lane:'output',type:'actuator',title:'Дискретная точка / Команда',subtitle:'Реле, лампа, соленоид',inputs:['command'],outputs:['active'],status:'ready',bindings:{output_target:'channel:relay_1',feedback:''}}
        ],
        edges:[
          {from:'src_button',fromPort:'state',to:'logic_input_behavior',toPort:'state',kind:'data'},
          {from:'logic_input_behavior',fromPort:'short_press',to:'logic_run_latch',toPort:'set',kind:'event'},
          {from:'logic_input_behavior',fromPort:'double_press',to:'logic_run_latch',toPort:'reset',kind:'event'},
          {from:'logic_input_behavior',fromPort:'held',to:'logic_enable_gate',toPort:'held',kind:'control'},
          {from:'logic_run_latch',fromPort:'run_enabled',to:'logic_timer',toPort:'run_request',kind:'control'},
          {from:'logic_enable_gate',fromPort:'permissive',to:'logic_timer',toPort:'permissive',kind:'control'},
          {from:'logic_timer',fromPort:'active',to:'out_relay',toPort:'command',kind:'control'}
        ]
      }
    }
  },
  flowmeter:{
    id:'flowmeter',
    label:'Test 2: Flowmeter',
    summary:'Проверка универсальной signal-processing цепочки: extraction, count, rate, total.',
    project:['Проект','Main'],
    states:[{id:'main',label:'Main',kind:'root',status:'active',flow:'main_flow'}],
    flows:{
      main_flow:{
        title:'Flowmeter flow',
        explain:'Аналоговый или цифровой источник проходит через extraction, затем count/rate/total и уже после этого попадает в display и alarms.',
        nodes:[
          {id:'src_a',lane:'source',type:'signal',title:'Source A',subtitle:'Digital / analog / diff pair',outputs:['value'],status:'ready'},
          {id:'logic_extract',lane:'logic',type:'processing',title:'Signal Extractor',subtitle:'Threshold / hysteresis / edge',inputs:['source_a','source_b'],outputs:['digital_state','pulse_event'],status:'ready'},
          {id:'logic_count',lane:'logic',type:'processing',title:'Counter / Totalizer',subtitle:'Count + retained total',inputs:['pulse_event'],outputs:['count_total','total'],status:'ready'},
          {id:'logic_rate',lane:'logic',type:'processing',title:'Rate / Window',subtitle:'Rate estimator + 24h average',inputs:['count_total'],outputs:['rate','avg_24h'],status:'ready'},
          {id:'out_display',lane:'output',type:'service',title:'Display / Alarm',subtitle:'Engineering values for operator',inputs:['rate','total'],outputs:['shown'],status:'ready'}
        ],
        edges:[
          {from:'src_a',fromPort:'value',to:'logic_extract',toPort:'source_a',kind:'data'},
          {from:'logic_extract',fromPort:'pulse_event',to:'logic_count',toPort:'pulse_event',kind:'event'},
          {from:'logic_count',fromPort:'count_total',to:'logic_rate',toPort:'count_total',kind:'data'},
          {from:'logic_rate',fromPort:'rate',to:'out_display',toPort:'rate',kind:'data'},
          {from:'logic_count',fromPort:'total',to:'out_display',toPort:'total',kind:'data'}
        ]
      }
    }
  },
  boiler:{
    id:'boiler',
    label:'Test 3: Boiler',
    summary:'Сложный reference: state machine сверху и flow-логика внутри каждого состояния.',
    project:['Проект','Boiler'],
    states:[
      {id:'idle',label:'IDLE',kind:'state',status:'ready',flow:'idle_flow'},
      {id:'purge',label:'PURGE',kind:'state',status:'active',flow:'purge_flow'},
      {id:'burning',label:'BURNING',kind:'state',status:'ready',flow:'burning_flow'},
      {id:'fault',label:'FAULT',kind:'state',status:'fault',flow:'fault_flow'}
    ],
    transitions:[
      {from:'idle',to:'purge',label:'start + permissive'},
      {from:'purge',to:'burning',label:'timer done'},
      {from:'burning',to:'idle',label:'pressure reached'},
      {from:'burning',to:'fault',label:'trip / low-low water'},
      {from:'fault',to:'idle',label:'manual reset'}
    ],
    flows:{
      idle_flow:{
        title:'Idle flow',
        explain:'Проверяются разрешения, режимы управления и готовность к переходу в purge.',
        nodes:[
          {id:'src_panel',lane:'source',type:'io',title:'Operator panel',subtitle:'Start / Stop / Reset',outputs:['start','stop'],status:'ready'},
          {id:'logic_permissive',lane:'logic',type:'policy',title:'Permissive / Trips',subtitle:'Pressure, level, flame, trips',inputs:['start'],outputs:['allow_start'],status:'ready'},
          {id:'out_state',lane:'output',type:'state',title:'Transition to PURGE',subtitle:'State machine edge',inputs:['allow_start'],outputs:['done'],status:'ready'}
        ],
        edges:[
          {from:'src_panel',fromPort:'start',to:'logic_permissive',toPort:'start',kind:'control'},
          {from:'logic_permissive',fromPort:'allow_start',to:'out_state',toPort:'allow_start',kind:'control'}
        ]
      },
      purge_flow:{
        title:'Purge flow',
        explain:'Вентилятор включается, таймер purge отсчитывает время, затем state machine получает разрешение идти дальше.',
        nodes:[
          {id:'src_enable',lane:'source',type:'state',title:'State active',subtitle:'PURGE is running',outputs:['active'],status:'active'},
          {id:'logic_timer',lane:'logic',type:'timer',title:'Purge timer',subtitle:'35 s',inputs:['enable'],outputs:['done'],status:'running'},
          {id:'out_fan',lane:'output',type:'actuator',title:'Fan actuator',subtitle:'Relay / feedback',inputs:['command'],outputs:['running'],status:'ready'}
        ],
        edges:[
          {from:'src_enable',fromPort:'active',to:'logic_timer',toPort:'enable',kind:'control'},
          {from:'src_enable',fromPort:'active',to:'out_fan',toPort:'command',kind:'control'}
        ]
      },
      burning_flow:{
        title:'Burning flow',
        explain:'Горение опирается на pressure demand, flame supervision и low-low water trip, но не должно смешиваться с water-level control loop.',
        nodes:[
          {id:'src_demand',lane:'source',type:'signal',title:'Pressure demand',subtitle:'Steam pressure < setpoint',outputs:['demand'],status:'ready'},
          {id:'logic_seq',lane:'logic',type:'sequence',title:'Burning subflow',subtitle:'Fuel + flame + fan logic',inputs:['demand'],outputs:['burn_cmd'],status:'ready'},
          {id:'out_burner',lane:'output',type:'actuator',title:'Burner outputs',subtitle:'Solenoids / ignition / fan',inputs:['burn_cmd'],outputs:['active'],status:'ready'}
        ],
        edges:[
          {from:'src_demand',fromPort:'demand',to:'logic_seq',toPort:'demand',kind:'data'},
          {from:'logic_seq',fromPort:'burn_cmd',to:'out_burner',toPort:'burn_cmd',kind:'control'}
        ]
      },
      fault_flow:{
        title:'Fault flow',
        explain:'Аларм и lockout закрывают исполнительные механизмы и ждут reset.',
        nodes:[
          {id:'src_trip',lane:'source',type:'signal',title:'Trip source',subtitle:'Low-low water / flame fail',outputs:['trip'],status:'fault'},
          {id:'logic_lockout',lane:'logic',type:'policy',title:'Trip / Lockout',subtitle:'Fault latch + reset policy',inputs:['trip'],outputs:['lockout'],status:'fault'},
          {id:'out_shutdown',lane:'output',type:'actuator',title:'Shutdown commands',subtitle:'Close valves / stop burner',inputs:['lockout'],outputs:['done'],status:'fault'}
        ],
        edges:[
          {from:'src_trip',fromPort:'trip',to:'logic_lockout',toPort:'trip',kind:'control'},
          {from:'logic_lockout',fromPort:'lockout',to:'out_shutdown',toPort:'lockout',kind:'control'}
        ]
      }
    }
  }
};

const LIBRARY=[
  {group:'Источники',items:[['io','I/O точка'],['signal','Сигнал'],['event','Событие']]},
  {group:'Логика',items:[['timer','Таймер'],['processing','Обработка'],['policy','Политика'],['sequence','Подсценарий']]},
  {group:'Исполнение',items:[['actuator','Команда'],['service','Экран / сервис'],['state','Переход']]}
];
const EDITOR_PROJECT_KEY_PREFIX='shipcontroller.editor.projectModel.';
const EDITOR_UI_STATE_KEY='shipcontroller.editor.ui';
const EDITOR_PROJECT_SCHEMA_REVISION=3;

function cloneEditorData(value){
  return JSON.parse(JSON.stringify(value));
}

function parseStoredJson(raw){
  try{return raw?JSON.parse(raw):null}catch{return null}
}

function editorProjectStorageKey(presetId){
  return EDITOR_PROJECT_KEY_PREFIX+(presetId||'test1');
}

function createBaseProjectModelFromPreset(presetId){
  const preset=DEMOS[presetId]||DEMOS.test1;
  const states=cloneEditorData(preset.states||[]);
  const transitions=cloneEditorData(preset.transitions||[]);
  const flows=cloneEditorData(preset.flows||{});
  return {
    version:'project_model_v2',
    id:preset.id,
    label:preset.label,
    summary:preset.summary,
    project:cloneEditorData(preset.project||['Проект']),
    root_flow:states[0]?.flow||Object.keys(flows)[0]||'',
    state_machine:{
      enabled:states.length>1,
      states,
      transitions
    },
    flows,
    compiler:{
      target:'existing_runtime',
      generated_preview:false
    },
    metadata:{
      source:'editor_preset',
      preset_id:preset.id,
      schema_revision:EDITOR_PROJECT_SCHEMA_REVISION
    },
    states,
    transitions
  };
}

function migrateTestOneProjectModel(model){
  const migrated=createBaseProjectModelFromPreset('test1');
  const sourceNode=editorNodeById(model,'src_button')||{};
  const timerNode=editorNodeById(model,'logic_timer')||{};
  const outputNode=editorNodeById(model,'out_relay')||{};
  const behaviorNode=editorNodeById(model,'logic_input_behavior')||{};
  const migratedSource=editorNodeById(migrated,'src_button');
  const migratedBehavior=editorNodeById(migrated,'logic_input_behavior');
  const migratedTimer=editorNodeById(migrated,'logic_timer');
  const migratedOutput=editorNodeById(migrated,'out_relay');
  if(migratedSource){
    migratedSource.bindings=Object.assign({},migratedSource.bindings||{},sourceNode.bindings||{});
    migratedSource.params=Object.assign({},migratedSource.params||{},sourceNode.params||{});
  }
  if(migratedBehavior){
    migratedBehavior.params=Object.assign({},migratedBehavior.params||{},behaviorNode.params||{});
    if(!migratedBehavior.params.debounce_ms){
      migratedBehavior.params.debounce_ms=String(timerNode.params?.debounce_ms||sourceNode.params?.debounce_ms||'50');
    }
  }
  const migratedLatch=editorNodeById(migrated,'logic_run_latch');
  if(migratedLatch){
    migratedLatch.bindings=Object.assign({
      set_source:'node:logic_input_behavior.short_press',
      reset_source:'node:logic_input_behavior.double_press'
    },migratedLatch.bindings||{});
  }
  const migratedPermissive=editorNodeById(migrated,'logic_enable_gate');
  if(migratedPermissive){
    migratedPermissive.title='Permissive';
    migratedPermissive.subtitle='held -> permissive';
    migratedPermissive.inputs=['held'];
    migratedPermissive.outputs=['permissive'];
    migratedPermissive.bindings=Object.assign({
      permissive_source:'node:logic_input_behavior.held'
    },migratedPermissive.bindings||{});
  }
  if(migratedTimer){
    migratedTimer.params=Object.assign({},migratedTimer.params||{},timerNode.params||{});
    migratedTimer.params.profile='cyclic_timer_v1';
    migratedTimer.title='Циклический таймер';
    migratedTimer.subtitle='run_request + permissive';
    migratedTimer.inputs=['run_request','permissive'];
    migratedTimer.outputs=['active','standby','phase_state','phase_remaining'];
    migratedTimer.bindings=Object.assign({
      run_request_source:'node:logic_run_latch.run_enabled',
      permissive_source:'node:logic_enable_gate.permissive'
    },migratedTimer.bindings||{});
  }
  if(migratedOutput){
    migratedOutput.bindings=Object.assign({},migratedOutput.bindings||{},outputNode.bindings||{});
    migratedOutput.params=Object.assign({},migratedOutput.params||{},outputNode.params||{});
  }
  migrated.id=model.id||migrated.id;
  migrated.label=model.label||migrated.label;
  migrated.summary=model.summary||migrated.summary;
  migrated.project=cloneEditorData(model.project||migrated.project);
  migrated.root_flow=model.root_flow||migrated.root_flow;
  migrated.compiler=Object.assign({},migrated.compiler||{},model.compiler||{});
  migrated.metadata=Object.assign({},migrated.metadata||{},model.metadata||{},{
    preset_id:'test1',
    schema_revision:EDITOR_PROJECT_SCHEMA_REVISION,
    migrated_from_revision:Number(model.metadata?.schema_revision||1)
  });
  const mainFlow=migrated.flows?.main_flow;
  if(mainFlow){
    mainFlow.explain='Raw вход даёт state, Input Behavior делает click/double/held, latch хранит run request, permissive разрешает цикл, таймер управляет командой.';
    mainFlow.edges=[
      {from:'src_button',fromPort:'state',to:'logic_input_behavior',toPort:'state',kind:'data'},
      {from:'logic_input_behavior',fromPort:'short_press',to:'logic_run_latch',toPort:'set',kind:'event'},
      {from:'logic_input_behavior',fromPort:'double_press',to:'logic_run_latch',toPort:'reset',kind:'event'},
      {from:'logic_input_behavior',fromPort:'held',to:'logic_enable_gate',toPort:'held',kind:'control'},
      {from:'logic_run_latch',fromPort:'run_enabled',to:'logic_timer',toPort:'run_request',kind:'control'},
      {from:'logic_enable_gate',fromPort:'permissive',to:'logic_timer',toPort:'permissive',kind:'control'},
      {from:'logic_timer',fromPort:'active',to:'out_relay',toPort:'command',kind:'control'}
    ];
  }
  return migrated;
}

function migrateEditorProjectModel(model,presetId){
  if(!model||model.version!=='project_model_v2')return null;
  const effectivePreset=presetId||model.metadata?.preset_id||model.id||'test1';
  const revision=Number(model.metadata?.schema_revision||1);
  if(effectivePreset==='test1'){
    const flow=model.flows?.main_flow;
    const nodeIds=new Set((flow?.nodes||[]).map(node=>node.id));
    const legacyTestOne=nodeIds.has('src_button')&&nodeIds.has('logic_timer')&&nodeIds.has('out_relay')&&!nodeIds.has('logic_input_behavior');
    if(legacyTestOne||revision<EDITOR_PROJECT_SCHEMA_REVISION){
      return migrateTestOneProjectModel(model);
    }
  }
  if(revision!==EDITOR_PROJECT_SCHEMA_REVISION){
    const cloned=cloneEditorData(model);
    cloned.metadata=Object.assign({},cloned.metadata||{},{schema_revision:EDITOR_PROJECT_SCHEMA_REVISION});
    return cloned;
  }
  return model;
}

function loadStoredEditorProjectModel(presetId){
  const parsed=parseStoredJson(localStorage.getItem(editorProjectStorageKey(presetId)));
  return parsed&&parsed.version==='project_model_v2'?migrateEditorProjectModel(parsed,presetId):null;
}

async function loadEditorProjectModelFromBackend(presetId){
  try{
    const response=await getJson('/editor-project-model?preset='+encodeURIComponent(presetId));
    const model=response?.model;
    return model&&model.version==='project_model_v2'?migrateEditorProjectModel(model,presetId):null;
  }catch{
    return null;
  }
}

async function saveEditorProjectModelToBackendNow(){
  const model=state.projectModel;
  if(!model?.metadata?.preset_id)return false;
  try{
    await getJson('/editor-project-model',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(model)
    });
    return true;
  }catch{
    return false;
  }
}

function scheduleEditorProjectBackendSave(){
  if(state.ui.editorPersistTimer)clearTimeout(state.ui.editorPersistTimer);
  state.ui.editorPersistTimer=setTimeout(()=>{
    saveEditorProjectModelToBackendNow();
  },250);
}

function saveEditorProjectModel(){
  const model=state.projectModel;
  if(!model?.metadata?.preset_id)return;
  localStorage.setItem(editorProjectStorageKey(model.metadata.preset_id),JSON.stringify(model));
  scheduleEditorProjectBackendSave();
}

function ensureMigratedProjectModelSaved(){
  if(state.projectModel?.metadata?.migrated_from_revision){
    saveEditorProjectModel();
    delete state.projectModel.metadata.migrated_from_revision;
  }
}

function loadStoredEditorUiState(){
  const parsed=parseStoredJson(localStorage.getItem(EDITOR_UI_STATE_KEY));
  return parsed&&typeof parsed==='object'?parsed:null;
}

function saveEditorUiState(){
  if(!state.ui?.editor)return;
  localStorage.setItem(EDITOR_UI_STATE_KEY,JSON.stringify({
    demo:state.ui.editor.demo||'test1',
    mode:state.ui.editor.mode||'flow',
    selectedId:state.ui.editor.selectedId||'',
    selectedKind:state.ui.editor.selectedKind||'node',
    activeFlow:state.ui.editor.activeFlow||'main_flow'
  }));
}

async function hydrateEditorProjectModelFromBackend(presetId){
  if(!presetId)return false;
  const model=await loadEditorProjectModelFromBackend(presetId);
  if(!model)return false;
  if(state.ui?.editor?.demo!==presetId)return false;
  const currentLocal=loadStoredEditorProjectModel(presetId);
  const backendJson=JSON.stringify(model);
  const localJson=currentLocal?JSON.stringify(currentLocal):'';
  if(backendJson===localJson)return false;
  state.projectModel=model;
  localStorage.setItem(editorProjectStorageKey(presetId),backendJson);
  ensureMigratedProjectModelSaved();
  renderEditor();
  return true;
}

async function loadEditorPreset(presetId,nextState){
  const backendModel=await loadEditorProjectModelFromBackend(presetId);
  state.projectModel=backendModel||loadStoredEditorProjectModel(presetId)||createProjectModelV2FromPreset(presetId);
  state.ui.editor=nextState;
  saveEditorProjectModel();
  renderEditor();
}

function createProjectModelV2FromPreset(presetId){
  return createBaseProjectModelFromPreset(presetId);
}

function ensureEditorProjectModel(){
  if(!state.projectModel){
    const presetId=state.ui?.editor?.demo||'test1';
    state.projectModel=loadStoredEditorProjectModel(presetId)||createProjectModelV2FromPreset(presetId);
    ensureMigratedProjectModelSaved();
  }
  return state.projectModel;
}

function ensureEditorState(){
  if(!state.ui.editor){
    state.ui.editor=loadStoredEditorUiState()||{demo:'test1',mode:'flow',selectedId:'',selectedKind:'',activeFlow:'main_flow'};
  }
  const demo=ensureEditorProjectModel();
  state.ui.editor.demo=demo?.metadata?.preset_id||state.ui.editor.demo||'test1';
  if(state.ui.editor.mode==='state'&&!demo.states?.length)state.ui.editor.mode='flow';
  if(!demo.flows[state.ui.editor.activeFlow]){
    state.ui.editor.activeFlow=demo.states?.find(x=>x.id===demo.states.find(y=>y.status==='active')?.id)?.flow||demo.states?.[0]?.flow||Object.keys(demo.flows)[0];
  }
  if(!state.ui.editor.selectedId){
    state.ui.editor.selectedKind=state.ui.editor.mode==='state'?'state':'node';
    state.ui.editor.selectedId=state.ui.editor.mode==='state'?(demo.states?.[0]?.id||''):(demo.flows[state.ui.editor.activeFlow]?.nodes?.[0]?.id||'');
  }
  return state.ui.editor;
}

function currentDemo(){
  ensureEditorState();
  return ensureEditorProjectModel();
}

function currentFlow(){
  const ui=ensureEditorState();
  const demo=currentDemo();
  const flow=demo.flows[ui.activeFlow];
  if(!flow||demo.metadata?.preset_id!=='test1')return flow;
  const cloned=cloneEditorData(flow);
  const sourceNode=(cloned.nodes||[]).find(item=>item.id==='src_button');
  const timerNode=(cloned.nodes||[]).find(item=>item.id==='logic_timer');
  if(sourceNode){
    const spec=normalizeTestOneSourceSpec(editorNodeById(demo,'src_button')||sourceNode);
    sourceNode.title='Источник сигнала';
    sourceNode.subtitle=spec.subtitle;
    sourceNode.outputs=spec.outputs.slice();
  }
  if(timerNode){
    const timerSpec=normalizeTestOneTimerSpec(editorNodeById(demo,'logic_timer')||timerNode);
    timerNode.subtitle=timerSpec.subtitle;
    timerNode.inputs=timerSpec.inputs.slice();
    const sourceEdgeIndex=(cloned.edges||[]).findIndex(item=>item.from==='src_button'&&item.to==='logic_timer');
    if(sourceEdgeIndex>=0){
      if(timerSpec.inputPort){
        const sourceSpec=normalizeTestOneSourceSpec(editorNodeById(demo,'src_button')||sourceNode||{});
        cloned.edges[sourceEdgeIndex].fromPort=sourceSpec.primaryPort;
        cloned.edges[sourceEdgeIndex].toPort=timerSpec.inputPort;
      }else{
        cloned.edges.splice(sourceEdgeIndex,1);
      }
    }
  }
  return cloned;
}

function editorNodeById(model,nodeId){
  for(const flow of Object.values(model?.flows||{})){
    const node=(flow?.nodes||[]).find(item=>item.id===nodeId);
    if(node)return node;
  }
  return null;
}

function normalizeTestOneSourceSpec(node){
  const sourceType=String(node?.params?.source_type||'discrete');
  const outputs=['state'];
  const subtitle=sourceType==='discrete'
    ? 'Сухой контакт, тумблер, дискретный вход'
    : 'Raw источник сигнала';
  return {sourceType,behavior:'level_state',runtimeProfile:'level_input',outputs,subtitle,primaryPort:'state'};
}

function sourceTypeLabel(type){
  return type==='discrete'?'Дискретный':
    type==='button'?'Кнопка / событие':
    type==='analog'?'Аналоговый':
    type==='pulse'?'Импульсный':
    type==='virtual'?'Виртуальный':
    type==='system'?'Системный':
    (type||'—');
}

function sourceBehaviorLabel(spec){
  return spec.sourceType==='discrete'?'Уровень':'Raw сигнал';
}

function sourcePortMeaning(spec,port){
  if(spec.sourceType==='discrete'&&port==='state')return 'ON, пока физический вход активен';
  return 'Выход источника';
}

function sourcePrimaryActivationText(spec){
  if(spec.sourceType==='discrete')return '`state` активен, пока сам вход находится в ON.';
  return '`state` показывает raw состояние источника.';
}

function sourcePrimarySelectionText(spec){
  if(spec.sourceType==='discrete')return 'Для следующего узла автоматически используется `state`.';
  return 'Для следующего узла автоматически используется `state`.';
}

function sourceOutputsMarkup(spec){
  return '<div class="editor-output-contract">'+spec.outputs.map(output=>'<div class="editor-output-row"><strong>'+output+'</strong><span>'+sourcePortMeaning(spec,output)+'</span></div>').join('')+'</div>';
}

function normalizeTestOneNodeSourceRef(value,fallbackNodeId,fallbackPort){
  const raw=String(value||'').trim();
  if(/^node:[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+$/.test(raw))return raw;
  return 'node:'+fallbackNodeId+'.'+fallbackPort;
}

function parseTestOneNodeSourceRef(value){
  const match=String(value||'').match(/^node:([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)$/);
  if(!match)return null;
  return {nodeId:match[1],port:match[2]};
}

function testOneNodeSourceLabel(value){
  const parsed=parseTestOneNodeSourceRef(value);
  if(!parsed)return '—';
  const node=editorNodeById(currentDemo(),parsed.nodeId);
  const nodeLabel=node?.title||parsed.nodeId;
  return nodeLabel+'.'+parsed.port;
}

function buildNodeSourceOptions(selectedValue,items){
  return items.map(item=>'<option value="'+escapeHtml(item.value)+'" '+(item.value===selectedValue?'selected':'')+'>'+escapeHtml(item.label)+'</option>').join('');
}

function testOneBehaviorSourceOptions(selectedValue){
  const base='logic_input_behavior';
  return buildNodeSourceOptions(selectedValue,[
    {value:'node:'+base+'.short_press',label:'Input Behavior.short_press'},
    {value:'node:'+base+'.double_press',label:'Input Behavior.double_press'},
    {value:'node:'+base+'.held',label:'Input Behavior.held'}
  ]);
}

function testOneRunRequestOptions(selectedValue){
  return buildNodeSourceOptions(selectedValue,[
    {value:'node:logic_run_latch.run_enabled',label:'Run latch.run_enabled'}
  ]);
}

function testOnePermissiveOptions(selectedValue){
  return buildNodeSourceOptions(selectedValue,[
    {value:'node:logic_enable_gate.permissive',label:'Permissive.permissive'},
    {value:'node:logic_input_behavior.held',label:'Input Behavior.held'}
  ]);
}

function resolveTestOneRuntimeSignalFromRef(model,ref){
  const parsed=parseTestOneNodeSourceRef(ref);
  if(!parsed)return '';
  const config=extractTestOneConfig(model);
  if(parsed.nodeId==='src_button'&&parsed.port==='state')return normalizeEditorRuntimeBinding(config.source_signal);
  if(parsed.nodeId==='logic_input_behavior')return 'logic_input_behavior_runtime.'+parsed.port;
  if(parsed.nodeId==='logic_run_latch'&&parsed.port==='run_enabled')return 'logic_run_latch.run_enabled';
  if(parsed.nodeId==='logic_enable_gate'&&parsed.port==='permissive')return 'logic_enable_gate.permissive';
  if(parsed.nodeId==='logic_timer'&&parsed.port==='active')return 'logic_timer_runtime.active';
  return '';
}

function edgeCaptionForRef(ref){
  const parsed=parseTestOneNodeSourceRef(ref);
  if(!parsed)return '?';
  if(parsed.nodeId==='src_button'&&parsed.port==='state')return 'state';
  if(parsed.nodeId==='logic_input_behavior'&&parsed.port==='short_press')return 'short';
  if(parsed.nodeId==='logic_input_behavior'&&parsed.port==='double_press')return 'double';
  if(parsed.nodeId==='logic_input_behavior'&&parsed.port==='held')return 'held';
  if(parsed.nodeId==='logic_run_latch'&&parsed.port==='run_enabled')return 'run';
  if(parsed.nodeId==='logic_enable_gate'&&parsed.port==='permissive')return 'perm';
  if(parsed.nodeId==='logic_timer'&&parsed.port==='active')return 'active';
  return parsed.port;
}

function buildTestOneConfiguredEdges(model){
  const config=extractTestOneConfig(model);
  return [
    {from:'src_button',fromPort:'state',to:'logic_input_behavior',toPort:'state',kind:'data',label:'state'},
    {
      from:(parseTestOneNodeSourceRef(config.latch_set_source)?.nodeId)||'logic_input_behavior',
      fromPort:(parseTestOneNodeSourceRef(config.latch_set_source)?.port)||'short_press',
      to:'logic_run_latch',
      toPort:'set',
      kind:'event',
      label:edgeCaptionForRef(config.latch_set_source)
    },
    {
      from:(parseTestOneNodeSourceRef(config.latch_reset_source)?.nodeId)||'logic_input_behavior',
      fromPort:(parseTestOneNodeSourceRef(config.latch_reset_source)?.port)||'double_press',
      to:'logic_run_latch',
      toPort:'reset',
      kind:'event',
      label:edgeCaptionForRef(config.latch_reset_source)
    },
    {
      from:(parseTestOneNodeSourceRef(config.permissive_source)?.nodeId)||'logic_input_behavior',
      fromPort:(parseTestOneNodeSourceRef(config.permissive_source)?.port)||'held',
      to:'logic_enable_gate',
      toPort:'held',
      kind:'control',
      label:edgeCaptionForRef(config.permissive_source)
    },
    {
      from:(parseTestOneNodeSourceRef(config.timer_run_request_source)?.nodeId)||'logic_run_latch',
      fromPort:(parseTestOneNodeSourceRef(config.timer_run_request_source)?.port)||'run_enabled',
      to:'logic_timer',
      toPort:'run_request',
      kind:'control',
      label:edgeCaptionForRef(config.timer_run_request_source)
    },
    {
      from:(parseTestOneNodeSourceRef(config.timer_permissive_source)?.nodeId)||'logic_enable_gate',
      fromPort:(parseTestOneNodeSourceRef(config.timer_permissive_source)?.port)||'permissive',
      to:'logic_timer',
      toPort:'permissive',
      kind:'control',
      label:edgeCaptionForRef(config.timer_permissive_source)
    },
    {from:'logic_timer',fromPort:'active',to:'out_relay',toPort:'command',kind:'control',label:'active -> command'}
  ];
}

function normalizeTestOneTimerSpec(node){
  const profile=String(node?.params?.profile||'cyclic_timer_v1');
  return {
    profile,
    subtitle:'run_request + permissive',
    inputs:['run_request','permissive'],
    outputs:['active','standby','phase_state','phase_remaining']
  };
}

function extractTestOneConfig(model){
  const source=editorNodeById(model,'src_button')||{};
  const behavior=editorNodeById(model,'logic_input_behavior')||{};
  const latch=editorNodeById(model,'logic_run_latch')||{};
  const permissive=editorNodeById(model,'logic_enable_gate')||{};
  const timer=editorNodeById(model,'logic_timer')||{};
  const output=editorNodeById(model,'out_relay')||{};
  const sourceSpec=normalizeTestOneSourceSpec(source);
  return {
    source_signal:String(source.bindings?.source_signal||'signal:start_button'),
    source_type:sourceSpec.sourceType,
    source_outputs:sourceSpec.outputs.slice(),
    debounce_ms:String(behavior.params?.debounce_ms||'50'),
    latch_set_source:normalizeTestOneNodeSourceRef(latch.bindings?.set_source,'logic_input_behavior','short_press'),
    latch_reset_source:normalizeTestOneNodeSourceRef(latch.bindings?.reset_source,'logic_input_behavior','double_press'),
    permissive_source:normalizeTestOneNodeSourceRef(permissive.bindings?.permissive_source,'logic_input_behavior','held'),
    timer_profile:String(timer.params?.profile||'cyclic_timer_v1'),
    on_time_ms:String(timer.params?.on_time_ms||'5000'),
    off_time_ms:String(timer.params?.off_time_ms||'295000'),
    stop_policy:String(timer.params?.stop_policy||'drop_immediately'),
    timer_run_request_source:normalizeTestOneNodeSourceRef(timer.bindings?.run_request_source,'logic_run_latch','run_enabled'),
    timer_permissive_source:normalizeTestOneNodeSourceRef(timer.bindings?.permissive_source,'logic_enable_gate','permissive'),
    output_target:String(output.bindings?.output_target||'channel:relay_1'),
    feedback:String(output.bindings?.feedback||'')
  };
}

function normalizeEditorRuntimeBinding(value){
  return String(value||'').replace(/^(signal|channel):/,'');
}

function buildInputBehaviorMaterializePayload(model){
  const config=extractTestOneConfig(model);
  const validation=testOneValidationSnapshot(model);
  const sourceOk=validationCheck(validation,'input_behavior_source')?.ok??false;
  const debounceOk=validationCheck(validation,'debounce_ms')?.ok??false;
  const inputSignal=normalizeEditorRuntimeBinding(config.source_signal);
  if(!inputSignal||!sourceOk)throw new Error('Сначала привяжи валидный дискретный source signal для Input Behavior.');
  if(!debounceOk)throw new Error('Сначала задай корректный debounce для Input Behavior.');
  return {
    block_id:'logic_input_behavior_runtime',
    type:'button',
    mode:'events',
    input:inputSignal,
    debounce_ms:Math.max(parseInt(config.debounce_ms||'50',10)||50,0),
    long_press_ms:800,
    double_press_ms:350,
    generated_by:'logic_input_behavior',
    generated_role:'button_events'
  };
}

async function editorMaterializeInputBehaviorNode(){
  const payload=buildInputBehaviorMaterializePayload(currentDemo());
  await getJson('/block-definition',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
  await loadAll();
}

function buildRunLatchMaterializePayload(model){
  const validation=testOneValidationSnapshot(model);
  const ready=validationCheck(validation,'run_latch_inputs')?.ok??false;
  const behaviorState=generatedRuntimeStateForOwner('logic_input_behavior');
  const config=extractTestOneConfig(model);
  if(!ready)throw new Error('Сначала доведи Source и Input Behavior до валидного состояния.');
  if(!behaviorState.exists)throw new Error('Сначала materialize Input Behavior.');
  return {
    block_id:'logic_run_latch_runtime',
    type:'latch',
    mode:'set_reset',
    set_input:resolveTestOneRuntimeSignalFromRef(model,config.latch_set_source),
    reset_input:resolveTestOneRuntimeSignalFromRef(model,config.latch_reset_source),
    output:'logic_run_latch.run_enabled',
    generated_by:'logic_run_latch',
    generated_role:'run_latch'
  };
}

async function editorMaterializeRunLatchNode(){
  const payload=buildRunLatchMaterializePayload(currentDemo());
  await getJson('/block-definition',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
  await loadAll();
}

function buildPermissiveMaterializePayload(model){
  const validation=testOneValidationSnapshot(model);
  const ready=validationCheck(validation,'enable_gate_inputs')?.ok??false;
  const behaviorState=generatedRuntimeStateForOwner('logic_input_behavior');
  const config=extractTestOneConfig(model);
  if(!ready)throw new Error('Сначала доведи Source и Input Behavior до совместимого состояния.');
  if(!behaviorState.exists)throw new Error('Сначала materialize Input Behavior.');
  const permissiveInput=resolveTestOneRuntimeSignalFromRef(model,config.permissive_source);
  return {
    block_id:'logic_enable_gate_runtime',
    type:'logic_gate',
    mode:'or',
    input:permissiveInput,
    input_b:permissiveInput,
    output:'logic_enable_gate.permissive',
    generated_by:'logic_enable_gate',
    generated_role:'permissive_signal'
  };
}

async function editorMaterializePermissiveNode(){
  const payload=buildPermissiveMaterializePayload(currentDemo());
  await getJson('/block-definition',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
  await loadAll();
}

function buildTimerMaterializePayloads(model){
  const config=extractTestOneConfig(model);
  const validation=testOneValidationSnapshot(model);
  const inputsReady=validationCheck(validation,'timer_inputs')?.ok??false;
  const onReady=validationCheck(validation,'on_time_ms')?.ok??false;
  const offReady=validationCheck(validation,'off_time_ms')?.ok??false;
  const latchState=generatedRuntimeStateForOwner('logic_run_latch');
  const permissiveState=generatedRuntimeStateForOwner('logic_enable_gate');
  const outputTarget=normalizeEditorRuntimeBinding(config.output_target);
  if(!inputsReady||!onReady||!offReady)throw new Error('Сначала доведи Input Behavior, Run latch, Permissive и параметры таймера до валидного состояния.');
  if(!latchState.exists)throw new Error('Сначала materialize Run latch.');
  if(!permissiveState.exists)throw new Error('Сначала materialize Permissive.');
  if(!outputTarget)throw new Error('Сначала привяжи I/O-точку-команду.');
  const onTimeMs=Math.max(parseInt(config.on_time_ms||'5000',10)||5000,1);
  const offTimeMs=Math.max(parseInt(config.off_time_ms||'0',10)||0,0);
  const cyclePeriodMs=Math.max(onTimeMs+offTimeMs,onTimeMs);
  return [{
    block_id:'logic_timer_enable_runtime',
    type:'logic_gate',
    mode:'and',
    input:resolveTestOneRuntimeSignalFromRef(model,config.timer_run_request_source),
    input_b:resolveTestOneRuntimeSignalFromRef(model,config.timer_permissive_source),
    output:'logic_timer.run_request_enable',
    generated_by:'logic_timer',
    generated_role:'timer_request_gate'
  },{
    block_id:'logic_timer_runtime',
    type:'timer',
    mode:'interval_while_enabled',
    trigger:'',
    enable:'logic_timer.run_request_enable',
    duration_ms:onTimeMs,
    period_ms:cyclePeriodMs,
    retrigger:false,
    start_immediately:false,
    output:outputTarget,
    generated_by:'logic_timer',
    generated_role:'runtime_timer'
  }];
}

async function editorMaterializeTimerNode(){
  const payloads=buildTimerMaterializePayloads(currentDemo());
  for(const payload of payloads){
    await getJson('/block-definition',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
  }
  await loadAll();
}

async function editorMaterializeTestOne(){
  const config=extractTestOneConfig(currentDemo());
  const inputSignal=normalizeEditorRuntimeBinding(config.source_signal);
  const outputTarget=normalizeEditorRuntimeBinding(config.output_target);
  const timerProfile='interval_while_enabled';
  const debounceMs=Math.max(parseInt(config.debounce_ms||'50',10)||50,0);
  const onTimeMs=Math.max(parseInt(config.on_time_ms||'5000',10)||5000,1);
  const offTimeMs=Math.max(parseInt(config.off_time_ms||'0',10)||0,0);
  const cyclePeriodMs=Math.max(onTimeMs+offTimeMs,onTimeMs);
  if(!inputSignal)throw new Error('Сначала привяжи или создай I/O-точку-источник.');
  if(!outputTarget)throw new Error('Сначала привяжи или создай I/O-точку-команду.');
  const requests=[
    Object.assign(buildInputBehaviorMaterializePayload(currentDemo()),{input:inputSignal,debounce_ms:debounceMs}),
    buildRunLatchMaterializePayload(currentDemo()),
    buildPermissiveMaterializePayload(currentDemo()),
    ...buildTimerMaterializePayloads(currentDemo())
  ];
  for(const payload of requests){
    await getJson('/block-definition',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
  }
  await loadAll();
}

function editorPortSignalId(nodeId,port){
  return nodeId+'.'+port;
}

function editorBlockKindFromNode(node){
  if(node.type==='timer')return 'timer';
  if(node.type==='processing'){
    const title=(node.title||'').toLowerCase();
    if(title.includes('extract'))return 'signal_extractor';
    if(title.includes('counter')||title.includes('totalizer'))return 'totalizer';
    if(title.includes('rate')||title.includes('window'))return 'rate_estimator';
    return 'processing';
  }
  if(node.type==='policy')return 'logic_gate';
  return node.type||'block';
}

function compileGeneratedInternals(model){
  const compiled={
    signals:[],
    blocks:[],
    sequences:[],
    links:[],
    ownership:[],
    notes:[]
  };
  if(!model)return compiled;
  const flowEntries=Object.entries(model.flows||{});
  const testOneConfiguredEdges=model.metadata?.preset_id==='test1'?buildTestOneConfiguredEdges(model):null;

  flowEntries.forEach(([flowId,flow])=>{
    const nodes=flow?.nodes||[];
    nodes.forEach(node=>{
      const ownerFlow=flowId;
      const effectiveNode=model.metadata?.preset_id==='test1'&&node.id==='src_button'
        ? Object.assign({},node,{
            title:'Источник сигнала',
            subtitle:normalizeTestOneSourceSpec(node).subtitle,
            outputs:normalizeTestOneSourceSpec(node).outputs.slice()
          })
        : model.metadata?.preset_id==='test1'&&node.id==='logic_timer'
          ? Object.assign({},node,{
              subtitle:normalizeTestOneTimerSpec(node).subtitle,
              inputs:normalizeTestOneTimerSpec(node).inputs.slice()
            })
          : node;
      if(effectiveNode.lane==='source'){
        compiled.ownership.push({kind:'source',id:effectiveNode.id,flow:ownerFlow,label:effectiveNode.title});
        (effectiveNode.outputs||[]).forEach(port=>{
          compiled.signals.push({
            id:editorPortSignalId(effectiveNode.id,port),
            class:effectiveNode.type==='event'?'event':'source',
            owner:effectiveNode.id,
            flow:ownerFlow,
            note:effectiveNode.type==='io'?'I/O point binding':(effectiveNode.type==='signal'?'Existing/project signal':'Source output')
          });
        });
      }else if(effectiveNode.lane==='logic'){
        if(effectiveNode.type==='sequence'){
          compiled.sequences.push({
            id:effectiveNode.id,
            flow:ownerFlow,
            title:effectiveNode.title,
            status:effectiveNode.status||'ready',
            outputs:(effectiveNode.outputs||[]).map(port=>editorPortSignalId(effectiveNode.id,port))
          });
        }else{
          compiled.blocks.push({
            id:effectiveNode.id,
            kind:editorBlockKindFromNode(effectiveNode),
            flow:ownerFlow,
            title:effectiveNode.title,
            inputs:[...(effectiveNode.inputs||[])],
            outputs:(effectiveNode.outputs||[]).map(port=>editorPortSignalId(effectiveNode.id,port))
          });
        }
        (effectiveNode.outputs||[]).forEach(port=>{
          compiled.signals.push({
            id:editorPortSignalId(effectiveNode.id,port),
            class:'derived',
            owner:effectiveNode.id,
            flow:ownerFlow,
            note:'Generated logic output'
          });
        });
      }else{
        compiled.ownership.push({kind:'command',id:effectiveNode.id,flow:ownerFlow,label:effectiveNode.title});
        (effectiveNode.outputs||[]).forEach(port=>{
          compiled.signals.push({
            id:editorPortSignalId(effectiveNode.id,port),
            class:'command',
            owner:effectiveNode.id,
            flow:ownerFlow,
            note:effectiveNode.type==='service'?'Display/service output':'Actuator status/output'
          });
        });
      }
    });

    ((model.metadata?.preset_id==='test1'&&flowId==='main_flow')?testOneConfiguredEdges:(flow?.edges||[])).forEach(edge=>{
      const effectiveEdge=model.metadata?.preset_id==='test1'&&edge.from==='src_button'&&edge.to==='logic_timer'
        ? (()=> {
            const timerSpec=normalizeTestOneTimerSpec(editorNodeById(model,'logic_timer')||{});
            if(!timerSpec.inputPort)return null;
            return Object.assign({},edge,{
              fromPort:normalizeTestOneSourceSpec(editorNodeById(model,'src_button')||{}).primaryPort,
              toPort:timerSpec.inputPort
            });
          })()
        : edge;
      if(!effectiveEdge)return;
      compiled.links.push({
        id:effectiveEdge.from+'__'+effectiveEdge.fromPort+'__'+effectiveEdge.to+'__'+effectiveEdge.toPort,
        from:editorPortSignalId(effectiveEdge.from,effectiveEdge.fromPort),
        to:effectiveEdge.to+'.'+effectiveEdge.toPort,
        kind:effectiveEdge.kind||'data',
        flow:flowId
      });
    });
  });

  if(model.metadata?.preset_id==='test1'){
    const sourceSpec=normalizeTestOneSourceSpec(editorNodeById(model,'src_button')||{});
    compiled.notes.push('Источник сигнала v1: сейчас поддержаны `Дискретный` и `Кнопка / событие`; дальше таймер materialize-ится в runtime block, команда уходит в I/O point роли реле.');
    compiled.notes.push('Текущий источник выдаёт: '+sourceSpec.outputs.join(', ')+'.');
  }else if(model.metadata?.preset_id==='flowmeter'){
    compiled.notes.push('Flowmeter preview показывает цепочку extraction -> totalizer -> rate estimator -> display/service без перехода в raw block tabs.');
  }else if(model.metadata?.preset_id==='boiler'){
    compiled.notes.push('Boiler preview показывает, что state machine и flow компилируются в sequence + blocks поверх того же runtime.');
  }

  compiled.summary={
    signalCount:compiled.signals.length,
    blockCount:compiled.blocks.length,
    sequenceCount:compiled.sequences.length,
    linkCount:compiled.links.length
  };
  return compiled;
}

function formatRuntimeDurationSeconds(value){
  const seconds=Math.max(Number(value)||0,0);
  if(seconds>=60){
    const minutes=Math.floor(seconds/60);
    const rest=Math.round(seconds%60);
    return minutes+':'+String(rest).padStart(2,'0');
  }
  if(seconds>=10)return Math.round(seconds)+' c';
  return seconds.toFixed(1).replace(/\.0$/,'')+' c';
}

function findRuntimeBlock(blockId){
  return state.blocks?.blocks?.[blockId]||null;
}

function findGeneratedBlocksByOwner(ownerId){
  return Object.entries(state.blocks?.blocks||{})
    .filter(([,block])=>!!block&&!!block.auto_generated&&String(block.generated_by||'')===String(ownerId||''))
    .map(([id,block])=>({id,block}));
}

function generatedRuntimeStateForOwner(ownerId){
  const owned=findGeneratedBlocksByOwner(ownerId);
  if(!owned.length)return {exists:false,loaded:false,items:[],label:'ещё не создан'};
  const loaded=owned.some(item=>item.block?.runtime_loaded!==false&&!item.block?.config_only);
  const configOnly=owned.every(item=>item.block?.config_only||item.block?.runtime_loaded===false);
  return {
    exists:true,
    loaded,
    configOnly,
    items:owned,
    label:loaded?'runtime создан':(configOnly?'создан, но не поднят':'создан')
  };
}

async function deleteBlockWithReview(blockId){
  const review=await getJson('/block-delete-review?block_id='+encodeURIComponent(blockId));
  const deleteBlocks=[];
  const deleteChannels=[];
  (review?.candidates||[]).forEach(item=>{
    if(!item?.recommended_delete)return;
    if(item.kind==='block')deleteBlocks.push(item.id);
    if(item.kind==='channel')deleteChannels.push(item.id);
  });
  await getJson('/block-delete',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      block_id:blockId,
      delete_blocks:deleteBlocks,
      delete_channels:deleteChannels
    })
  });
}

async function editorDeleteOwnedRuntime(ownerId){
  const owned=findGeneratedBlocksByOwner(ownerId);
  if(!owned.length)return false;
  for(const item of owned){
    await deleteBlockWithReview(item.id);
  }
  await loadAll();
  return true;
}

function findTimerOrdinalByBlockId(blockId){
  const entries=Object.entries(state.blocks?.blocks||{});
  let ordinal=0;
  for(const [id,block] of entries){
    if((block?.type||'')!=='timer')continue;
    ordinal+=1;
    if(id===blockId)return ordinal;
  }
  return 0;
}

function runtimeSignal(signalId){
  return state.signals?.signals?.[signalId]||null;
}

function runtimeBool(signalId){
  const record=runtimeSignal(signalId);
  if(!record)return false;
  if(typeof record.bool_value==='boolean')return record.bool_value;
  return !!record.value;
}

function runtimeSignalSummary(signalId,options={}){
  const record=runtimeSignal(signalId);
  if(!signalId)return {id:'',value:'—',detail:'не связан',tone:'missing'};
  if(!record){
    if(options.planned)return {id:signalId,value:'—',detail:options.plannedDetail||'ожидает materialize',tone:'waiting'};
    return {id:signalId,value:'—',detail:'нет runtime signal',tone:'missing'};
  }
  if(options.kind==='duration'){
    const value=formatRuntimeDurationSeconds(record.value);
    return {id:signalId,value,detail:record.status||'duration',tone:'waiting'};
  }
  if(typeof record.bool_value==='boolean'){
    const active=record.bool_value;
    return {
      id:signalId,
      value:active?'ON':'OFF',
      detail:record.status||'bool',
      tone:active?'active':'idle'
    };
  }
  return {
    id:signalId,
    value:String(record.value??'—'),
    detail:record.status||'value',
    tone:'waiting'
  };
}

function renderSignalTraceRows(rows){
  return '<div class="editor-signal-trace">'+rows.map(row=>{
    const summary=row.summary||runtimeSignalSummary(row.signalId,row.options||{});
    return '<div class="editor-signal-row tone-'+summary.tone+'"><label>'+row.label+'</label><strong>'+summary.value+'</strong><span>'+escapeHtml(summary.detail||row.signalId||summary.id||'—')+'</span></div>';
  }).join('')+'</div>';
}

function formatGeneratedBlockState(block){
  if(!block)return 'не создан';
  if(block.runtime_loaded===false&&block.config_only)return 'только в config';
  if(block.runtime_loaded===false)return 'не загружен';
  return 'runtime loaded';
}

function buildGeneratedOwnershipRows(items){
  return items.map(item=>
    '<div class="editor-preview-item"><strong>'+item.id+'</strong><span>'+item.ownerLabel+' · '+item.roleLabel+' · '+item.stateLabel+'</span></div>'
  ).join('')||'<div class="editor-empty-block">Generated blocks ещё не materialize-ились.</div>';
}

function testOneEdgeSignalId(edge,model,snapshot){
  const config=extractTestOneConfig(model);
  const behaviorBase='logic_input_behavior_runtime';
  if(edge.from==='src_button'&&edge.fromPort==='state')return String(config.source_signal||'').replace(/^signal:/,'');
  if(edge.from==='logic_input_behavior')return behaviorBase+'.'+edge.fromPort;
  if(edge.from==='logic_run_latch'&&edge.fromPort==='run_enabled')return 'logic_run_latch.run_enabled';
  if(edge.from==='logic_enable_gate'&&edge.fromPort==='permissive')return 'logic_enable_gate.permissive';
  if(edge.from==='logic_timer'&&edge.fromPort==='active'){
    return snapshot?.timerOrdinal?('timer.'+snapshot.timerOrdinal+'.active'):'';
  }
  return '';
}

function buildTestOneNodeTrace(node,model,snapshot){
  const config=extractTestOneConfig(model);
  const behaviorBase='logic_input_behavior_runtime';
  const behaviorReady=generatedRuntimeStateForOwner('logic_input_behavior').exists;
  const latchReady=generatedRuntimeStateForOwner('logic_run_latch').exists;
  const gateReady=generatedRuntimeStateForOwner('logic_enable_gate').exists;
  const timerReady=generatedRuntimeStateForOwner('logic_timer').exists;
  const behaviorPlanned={planned:true,plannedDetail:behaviorReady?'runtime ещё не поднят':'сначала materialize Input Behavior'};
  const latchPlanned={planned:true,plannedDetail:latchReady?'runtime ещё не поднят':'сначала materialize Run latch или весь Test 1'};
  const gatePlanned={planned:true,plannedDetail:gateReady?'runtime ещё не поднят':'сначала materialize Permissive или весь Test 1'};
  const timerPlanned={planned:true,plannedDetail:timerReady?'runtime ещё не поднят':'сначала materialize Таймер или весь Test 1'};
  if(node.id==='src_button'){
    return renderSignalTraceRows([
      {label:'IN raw',signalId:String(config.source_signal||'').replace(/^signal:/,'')},
      {label:'OUT state',signalId:String(config.source_signal||'').replace(/^signal:/,'')}
    ]);
  }
  if(node.id==='logic_input_behavior'){
    return renderSignalTraceRows([
      {label:'IN state',signalId:String(config.source_signal||'').replace(/^signal:/,'')},
      {label:'OUT short_press',signalId:behaviorBase+'.short_press',options:behaviorPlanned},
      {label:'OUT double_press',signalId:behaviorBase+'.double_press',options:behaviorPlanned},
      {label:'OUT held',signalId:behaviorBase+'.held',options:behaviorPlanned}
    ]);
  }
  if(node.id==='logic_run_latch'){
    return renderSignalTraceRows([
      {label:'IN set',signalId:resolveTestOneRuntimeSignalFromRef(model,config.latch_set_source),options:behaviorPlanned},
      {label:'IN reset',signalId:resolveTestOneRuntimeSignalFromRef(model,config.latch_reset_source),options:behaviorPlanned},
      {label:'OUT run_enabled',signalId:'logic_run_latch.run_enabled',options:latchPlanned}
    ]);
  }
  if(node.id==='logic_enable_gate'){
    return renderSignalTraceRows([
      {label:'IN permissive src',signalId:resolveTestOneRuntimeSignalFromRef(model,config.permissive_source),options:behaviorPlanned},
      {label:'OUT permissive',signalId:'logic_enable_gate.permissive',options:gatePlanned}
    ]);
  }
  if(node.id==='logic_timer'){
    return renderSignalTraceRows([
      {label:'IN run_request',signalId:resolveTestOneRuntimeSignalFromRef(model,config.timer_run_request_source),options:latchPlanned},
      {label:'IN permissive',signalId:resolveTestOneRuntimeSignalFromRef(model,config.timer_permissive_source),options:gatePlanned},
      {label:'OUT active',signalId:snapshot?.timerOrdinal?('timer.'+snapshot.timerOrdinal+'.active'):'',options:timerPlanned},
      {label:'OUT standby',signalId:'',summary:snapshot?.standbySummary||{id:'logic_timer.standby',value:'—',detail:'сначала materialize Таймер или весь Test 1',tone:'waiting'}},
      {label:'OUT phase_state',signalId:snapshot?.timerOrdinal?('timer.'+snapshot.timerOrdinal+'.phase_state'):'',options:timerPlanned},
      {label:'OUT remain',signalId:snapshot?.timerOrdinal?('timer.'+snapshot.timerOrdinal+'.phase_remaining'):'',options:snapshot?.timerOrdinal?{kind:'duration'}:timerPlanned}
    ]);
  }
  if(node.id==='out_relay'){
    return renderSignalTraceRows([
      {label:'IN command',signalId:snapshot?.timerOrdinal?('timer.'+snapshot.timerOrdinal+'.active'):'',options:timerPlanned},
      {label:'OUT channel',signalId:String(config.output_target||'').replace(/^channel:/,'')}
    ]);
  }
  return '';
}

function testOneRuntimeSnapshot(model){
  const config=extractTestOneConfig(model);
  const validation=testOneValidationSnapshot(model);
  const sourceSignalId=String(config.source_signal||'').replace(/^signal:/,'');
  const outputTargetId=String(config.output_target||'').replace(/^channel:/,'');
  const generatedIds=[
    {id:'logic_input_behavior_runtime',owner:'logic_input_behavior',ownerLabel:'Input Behavior',roleLabel:'button events'},
    {id:'logic_run_latch_runtime',owner:'logic_run_latch',ownerLabel:'Run latch',roleLabel:'set/reset latch'},
    {id:'logic_enable_gate_runtime',owner:'logic_enable_gate',ownerLabel:'Permissive',roleLabel:'held -> permissive'},
    {id:'logic_timer_enable_runtime',owner:'logic_timer',ownerLabel:'Таймер',roleLabel:'run_request AND permissive'},
    {id:'logic_timer_runtime',owner:'logic_timer',ownerLabel:'Таймер',roleLabel:'runtime timer'}
  ];
  const generated=generatedIds
    .map(item=>{
      const block=findRuntimeBlock(item.id);
      return block?{...item,block,stateLabel:formatGeneratedBlockState(block)}:null;
    })
    .filter(Boolean);
  const timerBlockId='logic_timer_runtime';
  const timerOrdinal=findTimerOrdinalByBlockId(timerBlockId);
  const runRequestSignalId='logic_run_latch.run_enabled';
  const permissiveSignalId='logic_enable_gate.permissive';
  const runningSignalId=timerOrdinal?('timer.'+timerOrdinal+'.running'):'';
  const activeSignalId=timerOrdinal?('timer.'+timerOrdinal+'.active'):'';
  const phaseStateSignalId=timerOrdinal?('timer.'+timerOrdinal+'.phase_state'):'';
  const phaseRemainingSignalId=timerOrdinal?('timer.'+timerOrdinal+'.phase_remaining'):'';
  const runRequestActive=runtimeBool(runRequestSignalId);
  const permissiveActive=runtimeBool(permissiveSignalId);
  const timerRunning=runningSignalId?runtimeBool(runningSignalId):false;
  const timerActive=activeSignalId?runtimeBool(activeSignalId):false;
  const phaseStateRecord=phaseStateSignalId?runtimeSignal(phaseStateSignalId):null;
  const phaseRemainingRecord=phaseRemainingSignalId?runtimeSignal(phaseRemainingSignalId):null;
  const outputSignal=outputTargetId?runtimeSignal(outputTargetId):null;
  const outputActive=outputSignal?(typeof outputSignal.bool_value==='boolean'?outputSignal.bool_value:!!outputSignal.value):timerActive;
  let serviceText='Test 1 ещё не materialize-ился в runtime.';
  let serviceTitle='Нет runtime';
  let serviceTone='neutral';
  let phaseLabel='Неактивен';
  const standbyActive=runRequestActive&&!permissiveActive;
  const standbySummary={
    id:'logic_timer.standby',
    value:standbyActive?'ON':'OFF',
    detail:standbyActive?'ожидает permissive':'standby неактивен',
    tone:standbyActive?'waiting':'idle'
  };
  if((phaseStateRecord?.status||'')==='on_phase')phaseLabel='Фаза ON';
  else if((phaseStateRecord?.status||'')==='off_phase')phaseLabel='Фаза OFF';
  else if(standbyActive)phaseLabel='Standby';
  if(timerOrdinal){
    if(standbyActive){
      serviceText='Run request уже включён, но таймер ждёт permissive и находится в standby.';
      serviceTitle='Standby';
      serviceTone='waiting';
    }else if(!timerRunning){
      serviceText='Таймер неактивен.';
      serviceTitle='Ожидание';
      serviceTone='idle';
    }else if((phaseStateRecord?.status||'')==='on_phase'||timerActive||outputActive){
      serviceText='Команда активна, выключится через '+formatRuntimeDurationSeconds(phaseRemainingRecord?.value)+'.';
      serviceTitle='Команда активна';
      serviceTone='active';
    }else{
      serviceText='Команда неактивна, включится через '+formatRuntimeDurationSeconds(phaseRemainingRecord?.value)+'.';
      serviceTitle='Команда ожидает';
      serviceTone='waiting';
    }
  }else if(!validation.ready){
    serviceText='Сначала заполни обязательные поля с красной подсветкой, потом materialize.';
    serviceTitle='Нужно заполнить';
    serviceTone='waiting';
  }else if(generated.length){
    serviceText='Generated blocks уже записаны, но runtime их ещё не поднял. Проверь блоки и повторную загрузку runtime.';
    serviceTitle='Runtime не поднят';
    serviceTone='waiting';
  }else{
    serviceText='Runtime ещё не создан. Нажми Materialize, чтобы собрать Test 1 в рантайм.';
    serviceTitle='Готов к materialize';
    serviceTone='idle';
  }
  return{
    config,
    generated,
    timerOrdinal,
    serviceText,
    serviceTitle,
    serviceTone,
    phaseLabel,
    sourceSignalId,
    outputTargetId,
    standbySummary,
    sourceSignal:sourceSignalId?runtimeSignal(sourceSignalId):null,
    outputSignal,
    timerSignals:{
      running:runningSignalId?runtimeSignal(runningSignalId):null,
      active:activeSignalId?runtimeSignal(activeSignalId):null,
      phaseState:phaseStateRecord,
      phaseRemaining:phaseRemainingRecord
    }
  };
}

function renderTestOneServicePanel(snapshot){
  const commandLabel=snapshot.outputSignal?(runtimeBool(snapshot.outputTargetId)?'Команда ON':'Команда OFF'):'Команда не создана';
  const sourceLabel=snapshot.sourceSignal?(runtimeBool(snapshot.sourceSignalId)?'Источник активен':'Источник неактивен'):'Источник не найден';
  return '<div class="editor-service-strip tone-'+snapshot.serviceTone+'"><div class="editor-service-main"><label>Сейчас</label><strong>'+snapshot.serviceTitle+'</strong><span>'+snapshot.serviceText+'</span></div><div class="editor-service-meta"><span class="editor-service-pill">'+commandLabel+'</span><span class="editor-service-pill">'+snapshot.phaseLabel+'</span><span class="editor-service-pill">'+sourceLabel+'</span></div></div>';
}

function testOneValidationSnapshot(model){
  const config=extractTestOneConfig(model);
  const sourceSignalId=String(config.source_signal||'').replace(/^signal:/,'');
  const outputTargetId=String(config.output_target||'').replace(/^channel:/,'');
  const sourceType=String(config.source_type||'discrete');
  const debounceMs=parseInt(config.debounce_ms,10);
  const onTimeMs=parseInt(config.on_time_ms,10)||0;
  const offTimeMs=parseInt(config.off_time_ms,10)||0;
  const offTimeRequired=true;
  const latchSetSelected=!!resolveTestOneRuntimeSignalFromRef(model,config.latch_set_source);
  const latchResetSelected=!!resolveTestOneRuntimeSignalFromRef(model,config.latch_reset_source);
  const permissiveSelected=!!resolveTestOneRuntimeSignalFromRef(model,config.permissive_source);
  const runRequestSelected=!!resolveTestOneRuntimeSignalFromRef(model,config.timer_run_request_source);
  const timerPermissiveSelected=!!resolveTestOneRuntimeSignalFromRef(model,config.timer_permissive_source);
  const checks=[
    {
      key:'source_signal',
      label:'Source signal',
      required:true,
      ok:!!sourceSignalId&&!!runtimeSignal(sourceSignalId),
      detail:sourceSignalId?('signal:'+sourceSignalId):'не задан'
    },
    {
      key:'input_behavior_source',
      label:'Input Behavior source',
      required:true,
      ok:sourceType==='discrete'&&!!sourceSignalId&&!!runtimeSignal(sourceSignalId),
      detail:sourceType==='discrete'
        ? (sourceSignalId?('совместим с '+sourceSignalId):'нужен source signal')
        : ('тип '+sourceType+' пока не поддержан')
    },
    {
      key:'debounce_ms',
      label:'Debounce',
      required:true,
      ok:Number.isFinite(debounceMs)&&debounceMs>=0&&debounceMs<=5000,
      detail:String(config.debounce_ms||'0')+' ms'
    },
    {
      key:'run_latch_inputs',
      label:'Run latch inputs',
      required:true,
      ok:sourceType==='discrete'&&!!sourceSignalId&&!!runtimeSignal(sourceSignalId)&&Number.isFinite(debounceMs)&&debounceMs>=0&&debounceMs<=5000&&latchSetSelected&&latchResetSelected,
      detail:testOneNodeSourceLabel(config.latch_set_source)+' / '+testOneNodeSourceLabel(config.latch_reset_source)
    },
    {
      key:'enable_gate_inputs',
      label:'Permissive inputs',
      required:true,
      ok:sourceType==='discrete'&&!!sourceSignalId&&!!runtimeSignal(sourceSignalId)&&Number.isFinite(debounceMs)&&debounceMs>=0&&debounceMs<=5000&&permissiveSelected,
      detail:testOneNodeSourceLabel(config.permissive_source)
    },
    {
      key:'timer_inputs',
      label:'Timer contract',
      required:true,
      ok:sourceType==='discrete'&&!!sourceSignalId&&!!runtimeSignal(sourceSignalId)&&Number.isFinite(debounceMs)&&debounceMs>=0&&debounceMs<=5000&&runRequestSelected&&timerPermissiveSelected,
      detail:testOneNodeSourceLabel(config.timer_run_request_source)+' + '+testOneNodeSourceLabel(config.timer_permissive_source)
    },
    {
      key:'output_target',
      label:'Output target',
      required:true,
      ok:!!outputTargetId&&!!state.channels?.channels?.[outputTargetId],
      detail:outputTargetId?('channel:'+outputTargetId):'не задан'
    },
    {
      key:'on_time_ms',
      label:'ON time',
      required:true,
      ok:onTimeMs>0,
      detail:String(config.on_time_ms||'0')+' ms'
    },
    {
      key:'off_time_ms',
      label:'OFF time',
      required:offTimeRequired,
      ok:offTimeRequired?offTimeMs>0:true,
      detail:String(config.off_time_ms||'0')+' ms'
    }
  ];
  return{
    ready:checks.every(item=>!item.required||item.ok),
    checks
  };
}

function isValidEditorGpio(value){
  const gpio=parseInt(value,10);
  return Number.isFinite(gpio)&&gpio>=0;
}

function fieldStateClass(state){
  return state===true?'editor-field editor-field-ok':state===false?'editor-field editor-field-error':'editor-field';
}

function validationCheck(snapshot,key){
  return (snapshot?.checks||[]).find(item=>item.key===key)||null;
}

function fieldStatusNote(required,state,invalidText){
  if(!required)return '';
  if(state===true)return '<span class="editor-field-status ok">Проверено</span>';
  return '<span class="editor-field-status error">'+escapeHtml(invalidText||'Нужно заполнить поле')+'</span>';
}

function wrapEditorField(label,control,options={}){
  const required=!!options.required;
  const state=Object.prototype.hasOwnProperty.call(options,'state')?options.state:null;
  const extra=options.extra||'';
  return '<label class="'+fieldStateClass(required?state:null)+'"><span class="editor-field-head"><span>'+label+(required?' <em>*</em>':'')+'</span>'+fieldStatusNote(required,state,options.invalidText)+'</span>'+control+extra+'</label>';
}

function renderValidationRows(checks){
  return checks.map(item=>
    '<div class="editor-preview-item"><strong>'+item.label+'</strong><span>'+(item.ok?'ok':'нужно исправить')+' · '+item.detail+'</span></div>'
  ).join('');
}

function buildGeneratedPreview(model,ui){
  const compiled=compileGeneratedInternals(model);
  const isTestOne=model.metadata?.preset_id==='test1';
  const testOneSnapshot=isTestOne?testOneRuntimeSnapshot(model):null;
  const testOneConfig=isTestOne?testOneSnapshot.config:null;
  const testOneValidation=isTestOne?testOneValidationSnapshot(model):null;
  const inputSignalId=isTestOne?String(testOneConfig.source_signal||'').replace(/^signal:/,''):'';
  const outputChannelId=isTestOne?String(testOneConfig.output_target||'').replace(/^channel:/,''):'';
  const hasInputSignal=isTestOne?!!state.signals?.signals?.[inputSignalId]:false;
  const hasOutputChannel=isTestOne?!!state.channels?.channels?.[outputChannelId]:false;
  const signalItems=compiled.signals.map(item=>
    '<div class="editor-preview-item"><strong>'+item.id+'</strong><span>'+item.class+' · '+item.note+'</span></div>'
  ).join('')||'<div class="editor-empty-block">Сигналы ещё не сформированы.</div>';
  const blockItems=compiled.blocks.map(item=>
    '<div class="editor-preview-item"><strong>'+item.id+'</strong><span>'+item.kind+' · '+item.title+'</span></div>'
  ).join('')||'<div class="editor-empty-block">Block materialization не требуется.</div>';
  const sequenceItems=compiled.sequences.map(item=>
    '<div class="editor-preview-item"><strong>'+item.id+'</strong><span>sequence · '+item.title+'</span></div>'
  ).join('')||'<div class="editor-empty-block">Отдельные sequence не генерируются.</div>';
  const linkItems=compiled.links.map(item=>
    '<div class="editor-preview-item"><strong>'+item.from+' → '+item.to+'</strong><span>'+item.kind+' · '+item.flow+'</span></div>'
  ).join('')||'<div class="editor-empty-block">Связей пока нет.</div>';
  const notes=compiled.notes.map(note=>'<div class="editor-note">'+note+'</div>').join('');
  const testOneBridge=isTestOne?'<div class="editor-preview-bridge"><div class="editor-note">Для `Test 1` редактор уже может materialize-ить runtime напрямую, без промежуточного перехода в `Modules`. `Modules` остаётся как advanced/debug путь.</div>'+renderTestOneServicePanel(testOneSnapshot)+'<div class="kv" style="margin-top:10px"><div><span>Тип источника</span><strong>'+sourceTypeLabel(testOneConfig.source_type)+'</strong></div><div><span>Input Behavior</span><strong>click / double_click / hold</strong></div><div><span>Run latch</span><strong>click = start, double_click = stop</strong></div><div><span>Permissive</span><strong>held -> permissive</strong></div><div><span>Таймер</span><strong>run_request + permissive</strong></div><div><span>Цикл ON / OFF</span><strong>'+testOneConfig.on_time_ms+' / '+testOneConfig.off_time_ms+' ms</strong></div><div><span>Команда</span><strong>'+testOneConfig.output_target+'</strong></div></div><div style="margin-top:10px"><span class="caps">Raw выход источника</span>'+sourceOutputsMarkup(normalizeTestOneSourceSpec(editorNodeById(model,'src_button')||{}))+'</div><div class="kv" style="margin-top:10px"><div><span>Нужный source signal</span><strong>'+(hasInputSignal?(testOneConfig.source_signal+' найден'):(testOneConfig.source_signal+' не найден'))+'</strong></div><div><span>Нужный output channel</span><strong>'+(hasOutputChannel?(testOneConfig.output_target+' найден'):(testOneConfig.output_target+' не найден'))+'</strong></div></div><section class="editor-preview-section" style="margin-top:12px"><h4>Materialized runtime</h4><div class="editor-preview-list">'+buildGeneratedOwnershipRows(testOneSnapshot.generated)+'</div></section><div class="kv" style="margin-top:10px"><div><span>Timer ordinal</span><strong>'+(testOneSnapshot.timerOrdinal?('#'+testOneSnapshot.timerOrdinal):'не найден')+'</strong></div><div><span>Source status</span><strong>'+(testOneSnapshot.sourceSignal?.status||'—')+'</strong></div><div><span>Permissive</span><strong>'+(testOneSnapshot.standbySummary?.detail||'—')+'</strong></div><div><span>Command status</span><strong>'+(testOneSnapshot.outputSignal?.status||'—')+'</strong></div><div><span>Phase state</span><strong>'+(testOneSnapshot.timerSignals.phaseState?.status||'—')+'</strong></div><div><span>Phase remaining</span><strong>'+(testOneSnapshot.timerSignals.phaseRemaining?formatRuntimeDurationSeconds(testOneSnapshot.timerSignals.phaseRemaining.value):'—')+'</strong></div></div><div class="actions" style="margin-top:12px"><button id="editorOpenTest1Modules" class="ghost">Открыть Test 1 в Modules</button><button id="editorMaterializeTest1" class="primary" '+(testOneValidation.ready?'':'disabled')+'>Materialize Test 1 в runtime</button></div></div>':'';
  return '<section class="editor-bottom-card"><div class="editor-panel-head"><h3>Generated internals preview</h3><p>Compiler preview показывает, что редактор отдаст в текущий runtime.</p></div><div class="editor-flow-overview editor-preview-overview"><div class="editor-overview-chip"><label>Signals</label><strong>'+compiled.summary.signalCount+'</strong></div><div class="editor-overview-chip"><label>Blocks</label><strong>'+compiled.summary.blockCount+'</strong></div><div class="editor-overview-chip"><label>Sequences</label><strong>'+compiled.summary.sequenceCount+'</strong></div><div class="editor-overview-chip"><label>Links</label><strong>'+compiled.summary.linkCount+'</strong></div></div><div class="editor-preview-grid"><section class="editor-preview-section"><h4>Signals</h4><div class="editor-preview-list">'+signalItems+'</div></section><section class="editor-preview-section"><h4>Blocks</h4><div class="editor-preview-list">'+blockItems+'</div></section><section class="editor-preview-section"><h4>Sequences</h4><div class="editor-preview-list">'+sequenceItems+'</div></section><section class="editor-preview-section"><h4>Links</h4><div class="editor-preview-list">'+linkItems+'</div></section></div>'+testOneBridge+'<div class="kv" style="margin-top:12px"><div><span>Model version</span><strong>'+(model.version||'—')+'</strong></div><div><span>Project</span><strong>'+model.id+'</strong></div><div><span>Current view</span><strong>'+ui.mode+'</strong></div><div><span>Root flow</span><strong>'+(model.root_flow||'—')+'</strong></div><div><span>Compiler target</span><strong>'+(model.compiler?.target||'—')+'</strong></div><div><span>Preview source</span><strong>'+(model.metadata?.source||'—')+'</strong></div></div>'+(notes?'<div class="editor-preview-notes">'+notes+'</div>':'')+'</section>';
}

function setEditorStatus(text){
  const el=$('editorStatus');
  if(el)el.textContent=text||'';
}

function laneTitle(id){
  return id==='source'?'Источники':id==='logic'?'Логика':'Команды';
}

function editorNodeTypeLabel(type){
  return type==='io'?'I/O точка':
    type==='signal'?'Сигнал':
    type==='event'?'Событие':
    type==='timer'?'Таймер':
    type==='processing'?'Обработка':
    type==='policy'?'Политика':
    type==='sequence'?'Подсценарий':
    type==='actuator'?'Команда':
    type==='service'?'Экран / сервис':
    type==='state'?'Переход':
    (type||'—');
}

function kindBadge(kind){
  return '<span class="module-badge '+(kind==='fault'?'error':'ok')+'">'+kind+'</span>';
}

function edgeColor(kind){
  return kind==='event'?'editor-edge-event':kind==='control'?'editor-edge-control':kind==='reference'?'editor-edge-ref':'editor-edge-data';
}

function buildStateMode(demo,ui){
  const states=(demo.states||[]).map(stateItem=>{
    const active=ui.selectedKind==='state'&&ui.selectedId===stateItem.id;
    return '<button class="editor-state-card'+(active?' active':'')+'" data-editor-select-state="'+stateItem.id+'"><div class="editor-state-top"><strong>'+stateItem.label+'</strong>'+kindBadge(stateItem.status||'ready')+'</div><span>'+stateItem.kind+'</span></button>';
  }).join('');
  const transitions=(demo.transitions||[]).map(link=>{
    return '<div class="editor-transition-row"><span><b>'+link.from.toUpperCase()+'</b> → <b>'+link.to.toUpperCase()+'</b></span><span class="caps">'+link.label+'</span></div>';
  }).join('')||'<div class="editor-empty-block">Для этого теста отдельная state machine не нужна.</div>';
  return '<div class="editor-canvas-stack"><section class="editor-canvas-panel"><div class="editor-panel-head"><h3>State machine</h3><p>'+demo.summary+'</p></div><div class="editor-state-strip">'+states+'</div><div class="editor-transition-stack">'+transitions+'</div></section></div>';
}

function editorNodeVisualClass(node){
  if(node.lane==='source')return 'visual-inputNode';
  if(node.type==='timer')return 'visual-timerNode';
  if(node.lane==='output')return 'visual-outputNode';
  if(node.type==='sequence'||node.type==='state')return 'visual-stateNode';
  return 'visual-logicNode';
}

function editorNodeKindBadge(node){
  if(node.lane==='source')return 'INPUT';
  if(node.type==='timer')return 'TIMER';
  if(node.lane==='output')return 'OUTPUT';
  if(node.type==='sequence'||node.type==='state')return 'STATE';
  return 'LOGIC';
}

function shortNodeLabel(nodeId){
  return nodeId==='src_button'?'Source':
    nodeId==='logic_input_behavior'?'InputBehavior':
    nodeId==='logic_run_latch'?'RunLatch':
    nodeId==='logic_enable_gate'?'Permissive':
    nodeId==='logic_timer'?'Timer':
    nodeId;
}

function testOneInputPortBindingForNode(node,port,model){
  const config=extractTestOneConfig(model);
  if(node.id==='logic_input_behavior'&&port==='state')return 'node:src_button.state';
  if(node.id==='logic_run_latch'&&port==='set')return config.latch_set_source;
  if(node.id==='logic_run_latch'&&port==='reset')return config.latch_reset_source;
  if(node.id==='logic_enable_gate'&&port==='held')return config.permissive_source;
  if(node.id==='logic_timer'&&port==='run_request')return config.timer_run_request_source;
  if(node.id==='logic_timer'&&port==='permissive')return config.timer_permissive_source;
  if(node.id==='out_relay'&&port==='command')return 'node:logic_timer.active';
  return '';
}

function portBindingChip(node,port,demo){
  return '';
}

function buildNodePortList(node,ports,side,demo){
  if(!(ports||[]).length)return '<div class="editor-port-item '+side+' muted">—</div>';
  return ports.map(port=>'<div class="editor-port-item '+side+'"><span class="editor-port-dot"></span><span>'+port+'</span>'+(side==='in'?portBindingChip(node,port,demo):'')+'</div>').join('');
}

function buildEditorNodeCard(node,demo,ui,testOneSnapshot,extraClass=''){
  const active=ui.selectedKind==='node'&&ui.selectedId===node.id;
  const trace=demo.id==='test1'?buildTestOneNodeTrace(node,demo,testOneSnapshot):'';
  const compactClass=demo.id==='test1'?' editor-node-card-compact':'';
  return '<button class="editor-node-card '+editorNodeVisualClass(node)+(active?' active':'')+compactClass+(extraClass?(' '+extraClass):'')+'" data-editor-select-node="'+node.id+'"><div class="editor-node-topbar"><strong>'+node.title+'</strong><div class="editor-node-topmeta"><span class="editor-node-kind">'+editorNodeKindBadge(node)+'</span>'+kindBadge(node.status||'ready')+'</div></div><p class="editor-node-subtitle">'+node.subtitle+'</p><div class="editor-node-port-columns"><div class="editor-node-port-col"><label>Входы</label>'+buildNodePortList(node,node.inputs||[],'in',demo)+'</div><div class="editor-node-port-col out"><label>Выходы</label>'+buildNodePortList(node,node.outputs||[],'out',demo)+'</div></div>'+trace+'</button>';
}

function buildTestOneFlowMode(demo,ui,flow,testOneSnapshot,flowCounts,edges,effectiveEdges){
  const orderedNodes=[
    {id:'src_button',step:'Шаг 1',caption:'Источник'},
    {id:'logic_input_behavior',step:'Шаг 2',caption:'Поведение'},
    {id:'logic_run_latch',step:'Шаг 3',caption:'Память'},
    {id:'logic_enable_gate',step:'Шаг 4',caption:'Permissive'},
    {id:'logic_timer',step:'Шаг 5',caption:'Таймер'},
    {id:'out_relay',step:'Шаг 6',caption:'Команда'}
  ];
  const wireToneClass=kind=>kind==='event'?'tone-waiting':kind==='control'?'tone-active':'tone-idle';
  const buildWireSvg=()=>{
    const cardWidth=166;
    const linkWidth=56;
    const gap=8;
    const stageHeight=228;
    let cursor=0;
    const cardRects=orderedNodes.map((item,index)=>{
      const rect={id:item.id,left:cursor,right:cursor+cardWidth};
      cursor+=cardWidth;
      if(index<orderedNodes.length-1)cursor+=gap+linkWidth+gap;
      return rect;
    });
    const rectById=Object.fromEntries(cardRects.map(item=>[item.id,item]));
    const portY={
      src_button:{out:{state:144}},
      logic_input_behavior:{in:{state:128},out:{short_press:144,double_press:160,held:176}},
      logic_run_latch:{in:{set:128,reset:144},out:{run_enabled:136}},
      logic_enable_gate:{in:{held:136},out:{permissive:136}},
      logic_timer:{in:{run_request:128,permissive:144},out:{active:136,standby:152,phase_state:168,phase_remaining:184}},
      out_relay:{in:{command:128}}
    };
    const portPoint=(nodeId,side,port)=>{
      const rect=rectById[nodeId];
      const fallbackY=136;
      const y=portY[nodeId]?.[side]?.[port]||fallbackY;
      const x=side==='out'?(rect.right-6):(rect.left+6);
      return {x,y};
    };
    const orthPath=(fromPoint,toPoint,routeY=null)=>{
      const lead=14;
      const x1=fromPoint.x;
      const y1=fromPoint.y;
      const x2=toPoint.x;
      const y2=toPoint.y;
      if(routeY==null){
        const midX=Math.round((x1+x2)/2);
        return `M ${x1} ${y1} L ${x1+lead} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2-lead} ${y2} L ${x2} ${y2}`;
      }
      return `M ${x1} ${y1} L ${x1+lead} ${y1} L ${x1+lead} ${routeY} L ${x2-lead} ${routeY} L ${x2-lead} ${y2} L ${x2} ${y2}`;
    };
    const mainPaths=effectiveEdges||[];
    const segments=mainPaths.map(path=>{
      const fromPoint=portPoint(path.from,'out',path.fromPort);
      const toPoint=portPoint(path.to,'in',path.toPort);
      const routeY=path.from==='logic_input_behavior'&&path.to==='logic_run_latch'
        ? (path.toPort==='set'?114:154)
        : path.from==='logic_input_behavior'&&path.to==='logic_enable_gate'
          ? 86
          : null;
      const pathData=orthPath(fromPoint,toPoint,routeY);
      const labelX=Math.round((fromPoint.x+toPoint.x)/2);
      const labelY=routeY!=null?routeY-6:Math.min(fromPoint.y,toPoint.y)-8;
      const tone=wireToneClass(path.kind);
      return '<g class="editor-wire '+tone+'"><path d="'+pathData+'"></path><circle cx="'+fromPoint.x+'" cy="'+fromPoint.y+'" r="4"></circle><circle cx="'+toPoint.x+'" cy="'+toPoint.y+'" r="4"></circle><text x="'+labelX+'" y="'+labelY+'" text-anchor="middle">'+path.label+'</text></g>';
    }).join('');
    const totalWidth=cardRects[cardRects.length-1].right;
    return '<svg class="editor-wire-layer" viewBox="0 0 '+totalWidth+' '+stageHeight+'" preserveAspectRatio="none">'+segments+'</svg>';
  };
  const nodesById=Object.fromEntries((flow.nodes||[]).map(node=>[node.id,node]));
  const chain=orderedNodes.map((item,index)=>{
    const node=nodesById[item.id];
    if(!node)return '';
    const card='<div class="editor-flow-step"><div class="editor-flow-step-head"><span class="caps">'+item.step+'</span><strong>'+item.caption+'</strong></div>'+buildEditorNodeCard(node,demo,ui,testOneSnapshot,'editor-node-card-flow')+'</div>';
    if(index===0)return card;
    return '<div class="editor-chain-link" aria-hidden="true"></div>'+card;
  }).join('');
  const railLinks=(effectiveEdges||[]).map(edge=>edgeMarkup(edge,demo,testOneSnapshot)).join('');
  return '<div class="editor-canvas-stack"><section class="editor-canvas-panel"><div class="editor-panel-head"><h3>'+flow.title+'</h3><p>'+flow.explain+'</p></div><div class="editor-flow-overview"><div class="editor-overview-chip"><label>Блоки</label><strong>'+(flow.nodes||[]).length+'</strong></div><div class="editor-overview-chip"><label>Источники</label><strong>'+flowCounts.source+'</strong></div><div class="editor-overview-chip"><label>Логика</label><strong>'+flowCounts.logic+'</strong></div><div class="editor-overview-chip"><label>Команды</label><strong>'+flowCounts.output+'</strong></div><div class="editor-overview-chip"><label>Связи</label><strong>'+flowCounts.links+'</strong></div></div><div class="editor-flow-chain-shell"><div class="editor-flow-stage">'+buildWireSvg()+'<div class="editor-flow-chain">'+chain+'</div></div></div><div class="editor-flow-secondary"><div class="editor-sidebar-caption">Все связи и сигналы</div><div class="editor-edge-cloud">'+railLinks+'</div></div></section></div>';
}

function edgeMarkup(edge,demo,testOneSnapshot){
  if(!edge)return '';
  const summary=demo.id==='test1'?runtimeSignalSummary(testOneEdgeSignalId(edge,demo,testOneSnapshot)):{value:edge.kind,detail:'',tone:'idle'};
  const trace=demo.id==='test1'
    ? '<em>'+escapeHtml(summary.value+(summary.detail?(' · '+summary.detail):''))+'</em>'
    : '';
  const fromLabel=demo.id==='test1'?shortNodeLabel(edge.from):edge.from;
  const toLabel=demo.id==='test1'?shortNodeLabel(edge.to):edge.to;
  return '<div class="editor-edge-pill '+edgeColor(edge.kind)+' tone-'+summary.tone+'"><b>'+fromLabel+'</b>.'+edge.fromPort+' → <b>'+toLabel+'</b>.'+edge.toPort+trace+'<span>'+edge.kind+'</span></div>';
}

function buildFlowMode(demo,ui){
  const flow=currentFlow();
  const testOneSnapshot=demo.id==='test1'?testOneRuntimeSnapshot(demo):null;
  const effectiveEdges=demo.id==='test1'?buildTestOneConfiguredEdges(demo):(flow.edges||[]);
  const flowCounts={
    source:(flow.nodes||[]).filter(node=>node.lane==='source').length,
    logic:(flow.nodes||[]).filter(node=>node.lane==='logic').length,
    output:(flow.nodes||[]).filter(node=>node.lane==='output').length,
    links:effectiveEdges.length
  };
  const edges=effectiveEdges.map(edge=>edgeMarkup(edge,demo,testOneSnapshot)).join('');
  if(demo.id==='test1'){
    return buildTestOneFlowMode(demo,ui,flow,testOneSnapshot,flowCounts,edges,effectiveEdges);
  }
  const lanes=['source','logic','output'].map(lane=>{
    const nodes=(flow.nodes||[]).filter(node=>node.lane===lane).map(node=>{
      return buildEditorNodeCard(node,demo,ui,testOneSnapshot);
    }).join('')||'<div class="editor-empty-lane">Пока пусто</div>';
    return '<div class="editor-lane"><div class="editor-lane-head"><h4>'+laneTitle(lane)+'</h4></div>'+nodes+'</div>';
  }).join('');
  return '<div class="editor-canvas-stack"><section class="editor-canvas-panel"><div class="editor-panel-head"><h3>'+flow.title+'</h3><p>'+flow.explain+'</p></div><div class="editor-flow-overview"><div class="editor-overview-chip"><label>Источники</label><strong>'+flowCounts.source+'</strong></div><div class="editor-overview-chip"><label>Логика</label><strong>'+flowCounts.logic+'</strong></div><div class="editor-overview-chip"><label>Команды</label><strong>'+flowCounts.output+'</strong></div><div class="editor-overview-chip"><label>Связи</label><strong>'+flowCounts.links+'</strong></div></div><div class="editor-lanes">'+lanes+'</div><div class="editor-edge-cloud">'+edges+'</div></section></div>';
}

function buildLibrary(){
  return '<div class="editor-sidebar-caption">Библиотека</div>'+LIBRARY.map(group=>'<div class="editor-library-group"><h4>'+group.group+'</h4><div class="editor-library-items compact">'+group.items.map(item=>'<button class="editor-library-item compact" type="button"><strong>'+item[1]+'</strong><span>'+item[0]+'</span></button>').join('')+'</div></div>').join('');
}

function buildProjectTree(demo,ui){
  return '<div class="editor-tree"><div class="editor-sidebar-caption">Проект</div>'+(demo.project||[]).map((part,index)=>'<div class="editor-tree-item'+(index===(demo.project.length-1)?' active':'')+'">'+part+'</div>').join('')+(demo.states?.length>1?'<div class="editor-tree-caption" style="margin-top:8px">Состояния</div>'+demo.states.map(stateItem=>'<button class="editor-tree-item action'+(ui.selectedKind==='state'&&ui.selectedId===stateItem.id?' active':'')+'" data-editor-select-state="'+stateItem.id+'">'+stateItem.label+'</button>').join(''):'')+'</div>';
}

function selectedEntity(){
  const ui=ensureEditorState();
  const demo=currentDemo();
  if(ui.selectedKind==='state'){
    return {kind:'state',value:(demo.states||[]).find(item=>item.id===ui.selectedId)};
  }
  return {kind:'node',value:(currentFlow()?.nodes||[]).find(item=>item.id===ui.selectedId)};
}

function updateEditorNodeBinding(nodeId,key,value){
  const node=editorNodeById(currentDemo(),nodeId);
  if(!node)return;
  if(!node.bindings)node.bindings={};
  node.bindings[key]=value;
  saveEditorProjectModel();
}

function updateEditorNodeParam(nodeId,key,value){
  const node=editorNodeById(currentDemo(),nodeId);
  if(!node)return;
  if(!node.params)node.params={};
  node.params[key]=value;
  saveEditorProjectModel();
}

function buildSignalOptionsByKind(selectedValue){
  const entries=Object.entries(state.signals?.signals||{});
  const physical=entries.filter(([,signal])=>signal.backing==='resource');
  const virtual=entries.filter(([,signal])=>signal.backing!=='resource');
  const renderGroup=(label,items)=>items.length
    ? '<optgroup label="'+label+'">'+items.map(([id,signal])=>'<option value="signal:'+escapeHtml(id)+'" '+(('signal:'+id)===selectedValue?'selected':'')+'>'+escapeHtml(id+' - '+(signal.label||signal.class||'signal'))+'</option>').join('')+'</optgroup>'
    : '';
  return '<option value="">Выбери signal</option>'+renderGroup('Физические сигналы',physical)+renderGroup('Виртуальные / derived',virtual);
}

function buildChannelOptions(selectedValue){
  const entries=Object.entries(state.channels?.channels||{});
  return '<option value="">Выбери channel</option>'+entries.map(([id,channel])=>'<option value="'+escapeHtml(id)+'" '+(id===selectedValue?'selected':'')+'>'+escapeHtml(id+' - '+(channel.type||'channel')+' / '+(channel.resource||channel.source_label||''))+'</option>').join('');
}

function ensureEditorTestOneWizardState(){
  if(!state.ui.editorTestOneWizard){
    state.ui.editorTestOneWizard={
      inputMode:'existing_signal',
      inputExistingChannelId:'',
      inputChannelId:'start_button',
      inputGpio:'4',
      inputPullup:true,
      inputInverted:false,
      outputMode:'existing_channel',
      outputChannelId:'relay_1',
      outputGpio:'26',
      outputInverted:false,
      outputInitial:false
    };
  }
  return state.ui.editorTestOneWizard;
}

async function createEditorTestOneInputPoint(){
  const wizard=ensureEditorTestOneWizardState();
  const existingChannelId=String(wizard.inputExistingChannelId||'').trim();
  if(existingChannelId&&state.channels?.channels?.[existingChannelId]){
    await loadAll();
    updateEditorNodeBinding('src_button','source_signal','signal:'+existingChannelId);
    return;
  }
  const channelId=String(wizard.inputChannelId||'').trim();
  const gpio=parseInt(wizard.inputGpio,10);
  if(!channelId){
    alert('Нужен ID I/O-точки-источника.');
    return;
  }
  if(!Number.isFinite(gpio)||gpio<0){
    alert('Нужен корректный GPIO для точки-источника.');
    return;
  }
  await getJson('/channel-binding',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      channel_id:channelId,
      type:'di',
      source_mode:'local',
      gpio,
      external_resource_id:'',
      inverted:!!wizard.inputInverted,
      pullup:!!wizard.inputPullup,
      initial:false
    })
  });
  await loadAll();
  updateEditorNodeBinding('src_button','source_signal','signal:'+channelId);
}

async function createEditorTestOneOutputPoint(){
  const wizard=ensureEditorTestOneWizardState();
  const channelId=String(wizard.outputChannelId||'').trim();
  const gpio=parseInt(wizard.outputGpio,10);
  if(!channelId){
    alert('Нужен ID I/O-точки-команды.');
    return;
  }
  if(!Number.isFinite(gpio)||gpio<0){
    alert('Нужен корректный GPIO для точки-команды.');
    return;
  }
  await getJson('/channel-binding',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      channel_id:channelId,
      type:'do',
      source_mode:'local',
      gpio,
      external_resource_id:'',
      inverted:!!wizard.outputInverted,
      pullup:false,
      initial:!!wizard.outputInitial
    })
  });
  await loadAll();
  updateEditorNodeBinding('out_relay','output_target','channel:'+channelId);
}

function buildTestOneNodeEditor(node){
  if(node.id==='src_button'){
    const signalOptions=buildSignalOptionsByKind(String(node.bindings?.source_signal||''));
    const channelOptions=buildChannelOptions(ensureEditorTestOneWizardState().inputExistingChannelId||'');
    const wizard=ensureEditorTestOneWizardState();
    const validation=testOneValidationSnapshot(currentDemo());
    const sourceSpec=normalizeTestOneSourceSpec(node);
    const sourceReady=validationCheck(validation,'source_signal')?.ok??false;
    const sourceMode=wizard.inputMode||'existing_signal';
    const existingChannelValid=!!wizard.inputExistingChannelId&&!!state.channels?.channels?.[wizard.inputExistingChannelId];
    const newChannelIdValid=!!String(wizard.inputChannelId||'').trim();
    const newInputGpioValid=isValidEditorGpio(wizard.inputGpio);
    const sourceBody=sourceMode==='existing_signal'
      ? wrapEditorField('Существующий signal','<select data-editor-binding="source_signal" data-editor-node="'+node.id+'">'+signalOptions+'</select>',{
          required:true,
          state:sourceReady,
          invalidText:'Выбери существующий signal'
        })
      : wrapEditorField('Существующий channel','<select id="editorTestOneInputExistingChannel">'+channelOptions+'</select>',{
          required:false,
          state:existingChannelValid===true?true:null
        })+wrapEditorField('ID нового channel','<input id="editorTestOneInputChannelId" type="text" value="'+escapeHtml(wizard.inputChannelId)+'" placeholder="start_button">',{
          required:!existingChannelValid,
          state:existingChannelValid?null:newChannelIdValid,
          invalidText:'Нужен ID нового channel'
        })+wrapEditorField('GPIO','<input id="editorTestOneInputGpio" type="number" min="0" step="1" value="'+escapeHtml(wizard.inputGpio)+'">',{
          required:!existingChannelValid,
          state:existingChannelValid?null:newInputGpioValid,
          invalidText:'Укажи корректный GPIO'
        })+'<label class="toggle"><span>Pull-up</span><input id="editorTestOneInputPullup" type="checkbox" '+(wizard.inputPullup?'checked':'')+'></label><label class="toggle"><span>Инвертировать</span><input id="editorTestOneInputInverted" type="checkbox" '+(wizard.inputInverted?'checked':'')+'></label>';
    const sourceAction=sourceMode==='create_from_channel'
      ? '<div class="actions" style="margin-top:12px"><button id="editorCreateTest1InputPoint" class="ghost">'+(wizard.inputExistingChannelId?'Использовать signal от выбранного channel':'Создать signal из channel')+'</button></div>'
      : '';
    return '<section class="editor-inspector-card editor-inspector-subcard" style="margin-top:12px"><h3>Источник сигнала</h3><div class="form-grid" style="margin-top:12px">'+wrapEditorField('Тип источника','<select data-editor-param="source_type" data-editor-node="'+node.id+'"><option value="discrete" '+(sourceSpec.sourceType==='discrete'?'selected':'')+'>Дискретный</option><option value="analog" disabled>Аналоговый (скоро)</option><option value="pulse" disabled>Импульсный (скоро)</option><option value="virtual" disabled>Виртуальный (скоро)</option><option value="system" disabled>Системный (скоро)</option></select>',{
      required:true,
      state:true
    })+'<label>Откуда взять signal<select id="editorTestOneInputMode"><option value="existing_signal" '+(sourceMode==='existing_signal'?'selected':'')+'>Использовать существующий signal</option><option value="create_from_channel" '+(sourceMode==='create_from_channel'?'selected':'')+'>Создать signal из channel</option></select></label>'+sourceBody+'</div><div class="editor-inspector-mini" style="margin-top:12px"><label>Что выдаёт</label>'+sourceOutputsMarkup(sourceSpec)+'</div><div class="editor-inspector-mini" style="margin-top:12px"><label>Основной выход для логики</label><p>'+sourcePrimarySelectionText(sourceSpec)+'</p></div><div class="editor-inspector-mini" style="margin-top:12px"><label>Когда источник считается активным</label><p>'+sourcePrimaryActivationText(sourceSpec)+'</p></div>'+sourceAction+'</section>';
  }
  if(node.id==='logic_input_behavior'){
    const validation=testOneValidationSnapshot(currentDemo());
    const behaviorSourceReady=validationCheck(validation,'input_behavior_source')?.ok??false;
    const debounceReady=validationCheck(validation,'debounce_ms')?.ok??false;
    const runtimeState=generatedRuntimeStateForOwner(node.id);
    const runtimeItems=runtimeState.items.map(item=>'<div class="editor-preview-item"><strong>'+item.id+'</strong><span>'+formatGeneratedBlockState(item.block)+'</span></div>').join('');
    return '<section class="editor-inspector-card editor-inspector-subcard" style="margin-top:12px"><h3>Input Behavior</h3><div class="form-grid" style="margin-top:12px">'+wrapEditorField('Режим анализа','<select disabled><option selected>Click / double click / held</option></select>',{
      required:true,
      state:behaviorSourceReady,
      invalidText:'Нужен валидный дискретный source signal'
    })+wrapEditorField('Антидребезг, мс','<input type="number" min="0" max="5000" step="1" data-editor-param="debounce_ms" data-editor-node="'+node.id+'" value="'+escapeHtml(node.params?.debounce_ms||'50')+'">',{
      required:true,
      state:debounceReady,
      invalidText:'Укажи debounce от 0 до 5000 мс'
    })+'</div><div class="editor-inspector-mini" style="margin-top:12px"><label>Что выдаёт</label><div class="editor-output-contract"><div class="editor-output-row"><strong>short_press</strong><span>Короткий импульс после короткого нажатия</span></div><div class="editor-output-row"><strong>double_press</strong><span>Короткий импульс после двойного нажатия</span></div><div class="editor-output-row"><strong>held</strong><span>ON, пока кнопка удерживается</span></div></div></div><div class="editor-inspector-mini" style="margin-top:12px"><label>Совместимость</label><p>Узел `Input Behavior` в `Test 1` сейчас рассчитан на raw дискретный `state` от `Источника сигнала`. Если источник не привязан или тип источника не дискретный, materialize будет считаться неготовым.</p></div><div class="editor-inspector-mini" style="margin-top:12px"><label>Runtime узла</label><p>Этот runtime привязан к owner `logic_input_behavior`. Удаление owner-узла должно удалять и его generated runtime.</p><div class="editor-preview-list" style="margin-top:10px">'+(runtimeItems||'<div class="editor-empty-block">Runtime этого узла ещё не создан.</div>')+'</div><div class="actions" style="margin-top:12px"><button id="editorMaterializeInputBehaviorNode" class="primary" '+((behaviorSourceReady&&debounceReady)?'':'disabled')+'>Materialize узел</button><button id="editorDeleteInputBehaviorRuntime" class="ghost" '+(runtimeState.exists?'':'disabled')+'>Удалить runtime узла</button></div></div></section>';
  }
  if(node.id==='logic_run_latch'){
    const validation=testOneValidationSnapshot(currentDemo());
    const ready=validationCheck(validation,'run_latch_inputs')?.ok??false;
    const runtimeState=generatedRuntimeStateForOwner(node.id);
    const runtimeItems=runtimeState.items.map(item=>'<div class="editor-preview-item"><strong>'+item.id+'</strong><span>'+formatGeneratedBlockState(item.block)+'</span></div>').join('');
    const config=extractTestOneConfig(currentDemo());
    return '<section class="editor-inspector-card editor-inspector-subcard" style="margin-top:12px"><h3>Run latch</h3><div class="form-grid" style="margin-top:12px">'+wrapEditorField('Сигнал запуска','<select data-editor-binding="set_source" data-editor-node="'+node.id+'">'+testOneBehaviorSourceOptions(config.latch_set_source)+'</select>',{
      required:true,
      state:!!resolveTestOneRuntimeSignalFromRef(currentDemo(),config.latch_set_source),
      invalidText:'Выбери set source'
    })+wrapEditorField('Сигнал остановки','<select data-editor-binding="reset_source" data-editor-node="'+node.id+'">'+testOneBehaviorSourceOptions(config.latch_reset_source)+'</select>',{
      required:true,
      state:!!resolveTestOneRuntimeSignalFromRef(currentDemo(),config.latch_reset_source),
      invalidText:'Выбери reset source'
    })+'</div><div class="editor-inspector-mini" style="margin-top:12px"><label>Логика</label><p>`short_press` обычно устанавливает `run_enabled`, а `double_press` обычно сбрасывает его. Этот узел хранит, должен ли цикл вообще работать.</p></div><div class="editor-inspector-mini" style="margin-top:12px"><label>Runtime узла</label><p>Run latch публикует `run_enabled` как owned runtime узла.</p><div class="editor-preview-list" style="margin-top:10px">'+(runtimeItems||'<div class="editor-empty-block">Runtime этого узла ещё не создан.</div>')+'</div><div class="actions" style="margin-top:12px"><button id="editorMaterializeRunLatchNode" class="primary" '+(ready?'':'disabled')+'>Materialize узел</button><button id="editorDeleteRunLatchRuntime" class="ghost" '+(runtimeState.exists?'':'disabled')+'>Удалить runtime узла</button></div></div></section>';
  }
  if(node.id==='logic_enable_gate'){
    const validation=testOneValidationSnapshot(currentDemo());
    const ready=validationCheck(validation,'enable_gate_inputs')?.ok??false;
    const runtimeState=generatedRuntimeStateForOwner(node.id);
    const runtimeItems=runtimeState.items.map(item=>'<div class="editor-preview-item"><strong>'+item.id+'</strong><span>'+formatGeneratedBlockState(item.block)+'</span></div>').join('');
    const config=extractTestOneConfig(currentDemo());
    return '<section class="editor-inspector-card editor-inspector-subcard" style="margin-top:12px"><h3>Permissive</h3><div class="form-grid" style="margin-top:12px">'+wrapEditorField('Источник permissive','<select data-editor-binding="permissive_source" data-editor-node="'+node.id+'">'+testOneBehaviorSourceOptions(config.permissive_source)+'</select>',{
      required:true,
      state:!!resolveTestOneRuntimeSignalFromRef(currentDemo(),config.permissive_source),
      invalidText:'Выбери permissive source'
    })+'</div><div class="editor-inspector-mini" style="margin-top:12px"><label>Логика</label><p>`permissive` показывает, можно ли сейчас реально запустить цикл. В `Test 1` он обычно строится из `held`, а позже сюда можно будет подать уже не кнопку, а внешний рабочий сигнал.</p></div><div class="editor-inspector-mini" style="margin-top:12px"><label>Runtime узла</label><p>Permissive публикует отдельный runtime signal, который потом может использовать таймер.</p><div class="editor-preview-list" style="margin-top:10px">'+(runtimeItems||'<div class="editor-empty-block">Runtime этого узла ещё не создан.</div>')+'</div><div class="actions" style="margin-top:12px"><button id="editorMaterializePermissiveNode" class="primary" '+(ready?'':'disabled')+'>Materialize узел</button><button id="editorDeletePermissiveRuntime" class="ghost" '+(runtimeState.exists?'':'disabled')+'>Удалить runtime узла</button></div></div></section>';
  }
  if(node.id==='logic_timer'){
    const validation=testOneValidationSnapshot(currentDemo());
    const timerSpec=normalizeTestOneTimerSpec(node);
    const onTimeReady=validationCheck(validation,'on_time_ms')?.ok??false;
    const offTimeCheck=validationCheck(validation,'off_time_ms');
    const offTimeRequired=!!offTimeCheck?.required;
    const offTimeReady=offTimeCheck?.ok??true;
    const timerInputsReady=validationCheck(validation,'timer_inputs')?.ok??false;
    const runtimeState=generatedRuntimeStateForOwner(node.id);
    const runtimeItems=runtimeState.items.map(item=>'<div class="editor-preview-item"><strong>'+item.id+'</strong><span>'+formatGeneratedBlockState(item.block)+'</span></div>').join('');
    const config=extractTestOneConfig(currentDemo());
    return '<section class="editor-inspector-card editor-inspector-subcard" style="margin-top:12px"><h3>Настройка таймера</h3><div class="form-grid" style="margin-top:12px">'+wrapEditorField('Режим','<select disabled><option selected>Циклический таймер v1</option></select>',{
      required:true,
      state:true
    })+wrapEditorField('Время ON, мс','<input type="number" min="1" step="1" data-editor-param="on_time_ms" data-editor-node="'+node.id+'" value="'+escapeHtml(node.params?.on_time_ms||'5000')+'">',{
      required:true,
      state:onTimeReady,
      invalidText:'Время ON должно быть больше 0'
    })+wrapEditorField('Время OFF, мс','<input type="number" min="0" step="1" data-editor-param="off_time_ms" data-editor-node="'+node.id+'" value="'+escapeHtml(node.params?.off_time_ms||'0')+'">',{
      required:offTimeRequired,
      state:offTimeRequired?offTimeReady:null,
      invalidText:'Для interval нужен OFF time больше 0'
    })+'<label>Политика остановки<select data-editor-param="stop_policy" data-editor-node="'+node.id+'">'+['finish_current_pulse','drop_immediately'].map(v=>'<option value="'+v+'" '+((node.params?.stop_policy||'')===v?'selected':'')+'>'+v+'</option>').join('')+'</select></label>'+wrapEditorField('Источник run_request','<select data-editor-binding="run_request_source" data-editor-node="'+node.id+'">'+testOneRunRequestOptions(config.timer_run_request_source)+'</select>',{
      required:true,
      state:!!resolveTestOneRuntimeSignalFromRef(currentDemo(),config.timer_run_request_source),
      invalidText:'Выбери run_request source'
    })+wrapEditorField('Источник permissive','<select data-editor-binding="permissive_source" data-editor-node="'+node.id+'">'+testOnePermissiveOptions(config.timer_permissive_source)+'</select>',{
      required:true,
      state:!!resolveTestOneRuntimeSignalFromRef(currentDemo(),config.timer_permissive_source),
      invalidText:'Выбери permissive source'
    })+'</div><div class="editor-inspector-mini" style="margin-top:12px"><label>Семантика</label><p>`run_request` говорит, что цикл вообще нужен. `permissive` говорит, что его сейчас можно реально выполнять. Поэтому таймер может быть не только active, но и в standby.</p></div><div class="editor-inspector-mini" style="margin-top:12px"><label>Runtime узла</label><p>Таймер materialize-ится как owned runtime pair: helper gate + timer primitive.</p><div class="editor-preview-list" style="margin-top:10px">'+(runtimeItems||'<div class="editor-empty-block">Runtime этого узла ещё не создан.</div>')+'</div><div class="actions" style="margin-top:12px"><button id="editorMaterializeTimerNode" class="primary" '+((timerInputsReady&&onTimeReady&&(!offTimeRequired||offTimeReady))?'':'disabled')+'>Materialize узел</button><button id="editorDeleteTimerRuntime" class="ghost" '+(runtimeState.exists?'':'disabled')+'>Удалить runtime узла</button></div></div></section>';
  }
  if(node.id==='out_relay'){
    const channelSelectOptions=buildChannelOptions(String(node.bindings?.output_target||'').replace(/^channel:/,''));
    const signalOptions=Object.keys(state.signals?.signals||{}).map(id=>'<option value="signal:'+escapeHtml(id)+'"></option>').join('');
    const wizard=ensureEditorTestOneWizardState();
    const validation=testOneValidationSnapshot(currentDemo());
    const outputReady=validationCheck(validation,'output_target')?.ok??false;
    const outputMode=wizard.outputMode||'existing_channel';
    const newOutputChannelIdValid=!!String(wizard.outputChannelId||'').trim();
    const newOutputGpioValid=isValidEditorGpio(wizard.outputGpio);
    const outputBody=outputMode==='existing_channel'
      ? wrapEditorField('Существующий channel','<select data-editor-binding="output_target" data-editor-node="'+node.id+'"><option value="">Выбери channel</option>'+channelSelectOptions.replace('<option value="">Выбери channel</option>','').replace(/value=\"([^\"]+)\"/g,'value="channel:$1"')+'</select>',{
          required:true,
          state:outputReady,
          invalidText:'Выбери существующий channel'
        })
      : wrapEditorField('ID нового channel','<input id="editorTestOneOutputChannelId" type="text" value="'+escapeHtml(wizard.outputChannelId)+'" placeholder="relay_1">',{
          required:true,
          state:newOutputChannelIdValid,
          invalidText:'Нужен ID нового channel'
        })+wrapEditorField('GPIO','<input id="editorTestOneOutputGpio" type="number" min="0" step="1" value="'+escapeHtml(wizard.outputGpio)+'">',{
          required:true,
          state:newOutputGpioValid,
          invalidText:'Укажи корректный GPIO'
        })+'<label class="toggle"><span>Инвертировать</span><input id="editorTestOneOutputInverted" type="checkbox" '+(wizard.outputInverted?'checked':'')+'></label><label class="toggle"><span>Стартовое ON</span><input id="editorTestOneOutputInitial" type="checkbox" '+(wizard.outputInitial?'checked':'')+'></label>';
    const outputAction=outputMode==='create_channel'
      ? '<div class="actions" style="margin-top:12px"><button id="editorCreateTest1OutputPoint" class="ghost">Создать channel команды</button></div>'
      : '';
    return '<section class="editor-inspector-card editor-inspector-subcard" style="margin-top:12px"><h3>Настройка команды</h3><div class="form-grid" style="margin-top:12px"><label>Роль точки<select id="editorTestOneOutputMode"><option value="existing_channel" '+(outputMode==='existing_channel'?'selected':'')+'>Использовать existing channel</option><option value="create_channel" '+(outputMode==='create_channel'?'selected':'')+'>Создать new channel</option></select></label>'+outputBody+'<label>Feedback<input type="text" list="editorTestOneFeedbackList" data-editor-binding="feedback" data-editor-node="'+node.id+'" value="'+escapeHtml(node.bindings?.feedback||'')+'" placeholder="signal:relay_feedback"></label></div>'+outputAction+'<datalist id="editorTestOneChannelList">'+channelOptions+'</datalist><datalist id="editorTestOneFeedbackList">'+signalOptions+'</datalist></section>';
  }
  return '';
}

function buildInspector(){
  const ui=ensureEditorState();
  const demo=currentDemo();
  const entity=selectedEntity();
  const value=entity.value;
  if(!value){
    return '<div class="editor-empty-block">Выбери state или узел.</div>';
  }
  const displayValue=demo.id==='test1'&&entity.kind==='node'&&value?.id==='src_button'
    ? Object.assign({},value,{
        title:'Источник сигнала',
        subtitle:normalizeTestOneSourceSpec(value).subtitle,
        outputs:normalizeTestOneSourceSpec(value).outputs.slice()
      })
    : value;
  const fields=entity.kind==='state'
    ? '<div class="kv"><div><span>Тип</span><strong>Состояние</strong></div><div><span>ID</span><strong>'+value.id+'</strong></div><div><span>Flow</span><strong>'+value.flow+'</strong></div><div><span>Статус</span><strong>'+value.status+'</strong></div></div><div class="editor-note" style="margin-top:12px">State machine — это orchestration layer. Внутри state живёт свой flow/subflow.</div>'
    : '<div class="kv"><div><span>Тип</span><strong>'+editorNodeTypeLabel(displayValue.type)+'</strong></div><div><span>ID</span><strong>'+displayValue.id+'</strong></div><div><span>Роль</span><strong>'+laneTitle(displayValue.lane)+'</strong></div><div><span>Статус</span><strong>'+displayValue.status+'</strong></div></div><section class="editor-inspector-card editor-inspector-subcard" style="margin-top:12px"><h3>Порты</h3><div class="kv" style="margin-top:12px"><div><span>Входы</span><strong>'+((displayValue.inputs||[]).join(', ')||'—')+'</strong></div><div><span>Выходы</span><strong>'+((displayValue.outputs||[]).join(', ')||'—')+'</strong></div></div></section><div class="editor-note" style="margin-top:12px">Bindings и параметры уже редактируются здесь. Следующий шаг — прямой compiler/materialize без промежуточного bridge в Modules.</div>';
  const explain=demo.id==='test1'
    ? 'Текущий референс должен привести к самому простому UX: кнопка даёт событие, таймер формирует активную фазу, команда уходит в реле.'
    : demo.id==='flowmeter'
      ? 'Этот тест проверяет, что product-first editor умеет показывать signal processing как понятную цепочку, а не как россыпь primitive-таблиц.'
      : 'Этот тест проверяет верхний orchestration layer: states, transitions и flow внутри состояния.';
  const testOneEditor=demo.id==='test1'&&entity.kind==='node'?buildTestOneNodeEditor(value):'';
  const testOneValidation=demo.id==='test1'?testOneValidationSnapshot(demo):null;
  const testOneRuntime=demo.id==='test1'?testOneRuntimeSnapshot(demo):null;
  const testOneInspectorExtras=demo.id==='test1'
    ? '<section class="editor-inspector-card editor-inspector-subcard" style="margin-top:12px"><h3>Inspect result</h3>'+(testOneValidation.ready?'<div class="editor-note" style="margin-top:12px">Обязательные поля проверены. Можно materialize-ить прямо из редактора.</div>':'<div class="editor-note editor-note-warning" style="margin-top:12px">Сначала исправь обязательные поля с красной подсветкой выше.</div>')+renderTestOneServicePanel(testOneRuntime)+'<div class="kv" style="margin-top:12px"><div><span>Timer ordinal</span><strong>'+(testOneRuntime.timerOrdinal?('#'+testOneRuntime.timerOrdinal):'—')+'</strong></div><div><span>Standby</span><strong>'+testOneRuntime.standbySummary.value+'</strong></div><div><span>Phase state</span><strong>'+(testOneRuntime.timerSignals.phaseState?.status||'—')+'</strong></div><div><span>Phase remaining</span><strong>'+(testOneRuntime.timerSignals.phaseRemaining?formatRuntimeDurationSeconds(testOneRuntime.timerSignals.phaseRemaining.value):'—')+'</strong></div><div><span>Source status</span><strong>'+(testOneRuntime.sourceSignal?.status||'—')+'</strong></div><div><span>Command status</span><strong>'+(testOneRuntime.outputSignal?.status||'—')+'</strong></div></div><div class="editor-preview-list" style="margin-top:12px">'+buildGeneratedOwnershipRows(testOneRuntime.generated)+'</div><div class="actions" style="margin-top:12px"><button id="editorMaterializeTest1FromInspector" class="primary" '+(testOneValidation.ready?'':'disabled')+'>Materialize</button><button id="editorOpenSignalsTab" class="ghost">Signals</button><button id="editorOpenChannelsTab" class="ghost">Channels</button><button id="editorOpenBlocksTab" class="ghost">Blocks</button></div></section>'
    : '';
  return '<section class="editor-inspector-card compact"><div class="editor-sidebar-caption">Инспектор</div>'+fields+testOneEditor+testOneInspectorExtras+'<div class="editor-inspector-mini"><label>Почему так</label><p>'+explain+'</p></div><div class="editor-inspector-mini"><label>Compiler</label><p>Editor -> JSON project model -> compiler -> current runtime (`signals + blocks + sequences`).</p></div></section>';
}

function renderEditor(){
  const root=$('editorRoot');
  if(!root)return;
  const ui=ensureEditorState();
  const demo=currentDemo();
  const top='<div class="editor-workspace-top compact"><div class="editor-workspace-brand compact"><div class="editor-brand-line"><h3>'+demo.label+'</h3><div class="editor-breadcrumb plain">'+(demo.project||[]).join(' / ')+' / '+(ui.mode==='state'?'State':'Flow')+'</div></div><p>'+demo.summary+'</p></div><div class="editor-toolbar compact"><div class="editor-chip-row compact"><button class="editor-chip '+(ui.mode==='flow'?'active':'')+'" data-editor-mode="flow">Flow</button><button class="editor-chip '+(ui.mode==='state'?'active':'')+'" data-editor-mode="state">State</button><button class="editor-chip '+(ui.demo==='test1'?'active':'')+'" id="editorLoadTest1">Test 1</button><button class="editor-chip '+(ui.demo==='flowmeter'?'active':'')+'" id="editorLoadFlowmeter">Flowmeter</button><button class="editor-chip '+(ui.demo==='boiler'?'active':'')+'" id="editorLoadBoiler">Boiler</button></div></div></div>';
  const center=ui.mode==='state'?buildStateMode(demo,ui):buildFlowMode(demo,ui);
  root.innerHTML='<div class="editor-workspace">'+top+'<div class="editor-grid"><aside class="editor-sidebar"><div class="editor-sidebar-section">'+buildProjectTree(demo,ui)+'</div><div class="editor-sidebar-section">'+buildLibrary()+'</div></aside><main class="editor-stage">'+center+'</main><aside class="editor-inspector">'+buildInspector()+'</aside></div>'+buildGeneratedPreview(demo,ui)+'</div>';
  saveEditorUiState();
  saveEditorProjectModel();
  if(state.ui.editorHydratedPreset!==demo.metadata?.preset_id){
    state.ui.editorHydratedPreset=demo.metadata?.preset_id||'';
    hydrateEditorProjectModelFromBackend(state.ui.editorHydratedPreset);
  }
}

function selectState(id){
  const demo=currentDemo();
  const stateItem=(demo.states||[]).find(item=>item.id===id);
  if(!stateItem)return;
  state.ui.editor.selectedKind='state';
  state.ui.editor.selectedId=id;
  state.ui.editor.activeFlow=stateItem.flow||state.ui.editor.activeFlow;
  renderEditor();
}

function selectNode(id){
  state.ui.editor.selectedKind='node';
  state.ui.editor.selectedId=id;
  renderEditor();
}

function bindEditorEvents(){
  const root=$('tab-editor');
  if(!root||root.dataset.editorBound)return;
  root.dataset.editorBound='1';
  root.addEventListener('click',event=>{
    const mode=event.target?.closest?.('[data-editor-mode]')?.dataset?.editorMode;
    const selectStateId=event.target?.closest?.('[data-editor-select-state]')?.dataset?.editorSelectState;
    const selectNodeId=event.target?.closest?.('[data-editor-select-node]')?.dataset?.editorSelectNode;
    if(mode){
      state.ui.editor.mode=mode;
      if(mode==='flow'&&state.ui.editor.selectedKind==='state'){
        const flow=currentFlow();
        const firstNode=flow?.nodes?.[0];
        if(firstNode){
          state.ui.editor.selectedKind='node';
          state.ui.editor.selectedId=firstNode.id;
        }
      }
      renderEditor();
      return;
    }
    if(selectStateId){
      selectState(selectStateId);
      return;
    }
    if(selectNodeId){
      selectNode(selectNodeId);
      return;
    }
    if(event.target?.id==='editorLoadTest1'){
      setEditorStatus('Загружен Test 1: Button -> Timer -> Relay.');
      loadEditorPreset('test1',{demo:'test1',mode:'flow',selectedKind:'node',selectedId:'src_button',activeFlow:'main_flow'});
      return;
    }
    if(event.target?.id==='editorLoadFlowmeter'){
      setEditorStatus('Загружен Test 2: Flowmeter.');
      loadEditorPreset('flowmeter',{demo:'flowmeter',mode:'flow',selectedKind:'node',selectedId:'logic_extract',activeFlow:'main_flow'});
      return;
    }
    if(event.target?.id==='editorLoadBoiler'){
      setEditorStatus('Загружен Test 3: Boiler.');
      loadEditorPreset('boiler',{demo:'boiler',mode:'state',selectedKind:'state',selectedId:'purge',activeFlow:'purge_flow'});
      return;
    }
    if(event.target?.id==='editorOpenTest1Modules'){
      window.shipModulesBridge?.ensureTestOneWorkspace?.(extractTestOneConfig(currentDemo()));
      switchTab('modules');
      setEditorStatus('Открыт эквивалентный Test 1 workspace в Modules.');
      return;
    }
    if(event.target?.id==='editorMaterializeTest1'){
      editorMaterializeTestOne().then(()=>{
        setEditorStatus('Test 1 materialize выполнен напрямую из редактора.');
        renderEditor();
      }).catch(error=>{
        alert(error?.message||error);
      });
      return;
    }
    if(event.target?.id==='editorMaterializeTest1FromInspector'){
      editorMaterializeTestOne().then(()=>{
        setEditorStatus('Test 1 materialize выполнен напрямую из инспектора.');
        renderEditor();
      }).catch(error=>{
        alert(error?.message||error);
      });
      return;
    }
    if(event.target?.id==='editorMaterializeInputBehaviorNode'){
      editorMaterializeInputBehaviorNode().then(()=>{
        setEditorStatus('Input Behavior materialize-ился как отдельный runtime owner-узел.');
        renderEditor();
      }).catch(error=>alert(error?.message||error));
      return;
    }
    if(event.target?.id==='editorMaterializeRunLatchNode'){
      editorMaterializeRunLatchNode().then(()=>{
        setEditorStatus('Run latch materialize-ился как отдельный runtime owner-узел.');
        renderEditor();
      }).catch(error=>alert(error?.message||error));
      return;
    }
    if(event.target?.id==='editorMaterializePermissiveNode'){
      editorMaterializePermissiveNode().then(()=>{
        setEditorStatus('Permissive materialize-ился как отдельный runtime owner-узел.');
        renderEditor();
      }).catch(error=>alert(error?.message||error));
      return;
    }
    if(event.target?.id==='editorMaterializeTimerNode'){
      editorMaterializeTimerNode().then(()=>{
        setEditorStatus('Таймер materialize-ился как owned runtime helper + timer.');
        renderEditor();
      }).catch(error=>alert(error?.message||error));
      return;
    }
    if(event.target?.id==='editorDeleteInputBehaviorRuntime'){
      editorDeleteOwnedRuntime('logic_input_behavior').then((deleted)=>{
        setEditorStatus(deleted?'Runtime Input Behavior удалён вместе с owner-связью.':'У Input Behavior пока нет generated runtime.');
        renderEditor();
      }).catch(error=>alert(error?.message||error));
      return;
    }
    if(event.target?.id==='editorDeleteRunLatchRuntime'){
      editorDeleteOwnedRuntime('logic_run_latch').then((deleted)=>{
        setEditorStatus(deleted?'Runtime Run latch удалён вместе с owner-связью.':'У Run latch пока нет generated runtime.');
        renderEditor();
      }).catch(error=>alert(error?.message||error));
      return;
    }
    if(event.target?.id==='editorDeletePermissiveRuntime'){
      editorDeleteOwnedRuntime('logic_enable_gate').then((deleted)=>{
        setEditorStatus(deleted?'Runtime Permissive удалён вместе с owner-связью.':'У Permissive пока нет generated runtime.');
        renderEditor();
      }).catch(error=>alert(error?.message||error));
      return;
    }
    if(event.target?.id==='editorDeleteTimerRuntime'){
      editorDeleteOwnedRuntime('logic_timer').then((deleted)=>{
        setEditorStatus(deleted?'Runtime Таймера удалён вместе с owner-связью.':'У Таймера пока нет generated runtime.');
        renderEditor();
      }).catch(error=>alert(error?.message||error));
      return;
    }
    if(event.target?.id==='editorCreateTest1InputPoint'){
      createEditorTestOneInputPoint().then(()=>{
        setEditorStatus('Создана I/O-точка-источник и привязана в редакторе.');
        renderEditor();
      }).catch(error=>alert(error?.message||error));
      return;
    }
    if(event.target?.id==='editorCreateTest1OutputPoint'){
      createEditorTestOneOutputPoint().then(()=>{
        setEditorStatus('Создана I/O-точка-команда и привязана в редакторе.');
        renderEditor();
      }).catch(error=>alert(error?.message||error));
      return;
    }
    if(event.target?.id==='editorOpenSignalsTab'){
      switchTab('signals');
      return;
    }
    if(event.target?.id==='editorOpenChannelsTab'){
      switchTab('channels');
      return;
    }
    if(event.target?.id==='editorOpenBlocksTab'){
      switchTab('blocks');
      return;
    }
    if(event.target?.id==='editorAutoLayout'){
      setEditorStatus('Auto layout — следующий шаг. Сейчас layout фиксирован как reference.');
      return;
    }
    if(event.target?.id==='editorCenterView'){
      setEditorStatus('Center view — следующий шаг вместе с настоящим canvas.');
    }
  });
  root.addEventListener('change',event=>{
    const bindingKey=event.target?.dataset?.editorBinding;
    const paramKey=event.target?.dataset?.editorParam;
    const nodeId=event.target?.dataset?.editorNode;
    if(bindingKey&&nodeId){
      updateEditorNodeBinding(nodeId,bindingKey,event.target.value);
      setEditorStatus('Обновлена привязка узла '+nodeId+'.');
      renderEditor();
      return;
    }
    if(paramKey&&nodeId){
      updateEditorNodeParam(nodeId,paramKey,event.target.value);
      setEditorStatus('Обновлён параметр узла '+nodeId+'.');
      renderEditor();
      return;
    }
    const wizard=ensureEditorTestOneWizardState();
    if(event.target?.id==='editorTestOneInputMode'){wizard.inputMode=event.target.value;renderEditor();return}
    if(event.target?.id==='editorTestOneOutputMode'){wizard.outputMode=event.target.value;renderEditor();return}
    if(event.target?.id==='editorTestOneInputExistingChannel'){wizard.inputExistingChannelId=event.target.value;renderEditor();return}
    if(event.target?.id==='editorTestOneInputChannelId'){wizard.inputChannelId=event.target.value;renderEditor();return}
    if(event.target?.id==='editorTestOneInputGpio'){wizard.inputGpio=event.target.value;renderEditor();return}
    if(event.target?.id==='editorTestOneInputPullup'){wizard.inputPullup=event.target.checked;renderEditor();return}
    if(event.target?.id==='editorTestOneInputInverted'){wizard.inputInverted=event.target.checked;renderEditor();return}
    if(event.target?.id==='editorTestOneOutputChannelId'){wizard.outputChannelId=event.target.value;renderEditor();return}
    if(event.target?.id==='editorTestOneOutputGpio'){wizard.outputGpio=event.target.value;renderEditor();return}
    if(event.target?.id==='editorTestOneOutputInverted'){wizard.outputInverted=event.target.checked;renderEditor();return}
    if(event.target?.id==='editorTestOneOutputInitial'){wizard.outputInitial=event.target.checked;renderEditor();return}
  });
  root.addEventListener('input',event=>{
    const wizard=state.ui.editorTestOneWizard;
    if(!wizard)return;
    if(event.target?.id==='editorTestOneInputMode'){wizard.inputMode=event.target.value;return}
    if(event.target?.id==='editorTestOneOutputMode'){wizard.outputMode=event.target.value;return}
    if(event.target?.id==='editorTestOneInputExistingChannel'){wizard.inputExistingChannelId=event.target.value;return}
    if(event.target?.id==='editorTestOneInputChannelId'){wizard.inputChannelId=event.target.value;return}
    if(event.target?.id==='editorTestOneInputGpio'){wizard.inputGpio=event.target.value;return}
    if(event.target?.id==='editorTestOneOutputChannelId'){wizard.outputChannelId=event.target.value;return}
    if(event.target?.id==='editorTestOneOutputGpio'){wizard.outputGpio=event.target.value;return}
    const bindingKey=event.target?.dataset?.editorBinding;
    const paramKey=event.target?.dataset?.editorParam;
    const nodeId=event.target?.dataset?.editorNode;
    if(bindingKey&&nodeId){
      updateEditorNodeBinding(nodeId,bindingKey,event.target.value);
      return;
    }
    if(paramKey&&nodeId){
      updateEditorNodeParam(nodeId,paramKey,event.target.value);
    }
  });
}

bindEditorEvents();
window.renderEditor=renderEditor;
})();
