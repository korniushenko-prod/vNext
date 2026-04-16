const SEQUENCE_API = window.SHIP_API?.endpoints || {};

function renderSequenceSignalOptions(){
  const signalOptions=Object.entries(state.signals?.signals||{})
    .map(([id,signal])=>'<option value="'+id+'">'+id+' - '+(signal.label||id)+'</option>')
    .join('');
  ['sequenceEnableSignal','sequenceStartSignal','sequenceTripSignal','sequenceResetSignal','sequenceStatePermissive','sequenceTransitionWhen'].forEach(id=>{
    if($(id))$(id).innerHTML='<option value="">Нет</option>'+signalOptions;
  });
}

function sequenceStatusPill(sequence){
  const status=sequence?.status||'idle';
  const tone=status==='fault'?'bad':status==='done'?'ok':status==='running'?'ok':status==='waiting'?'pending':'info';
  return '<span class="status-pill '+tone+'">'+escapeHtml(status)+'</span>';
}

function sequenceReasonText(sequence){
  if(!sequence)return '-';
  if(sequence.fault_reason)return sequence.fault_reason;
  if(sequence.waiting_reason)return sequence.waiting_reason;
  if(sequence.detail)return sequence.detail;
  return '-';
}

function parseSequenceActions(value){
  return String(value||'').split(',').map(item=>item.trim()).filter(Boolean);
}

function ensureSequenceActionSemanticsUi(){
  if($('sequenceActionSemanticsNote')) return;
  const actionsOn=$('sequenceStateActionsOn');
  if(!actionsOn) return;
  const note=document.createElement('div');
  note.id='sequenceActionSemanticsNote';
  note.className='readonly-note';
  note.style.marginTop='10px';
  note.textContent='Action semantics: plain ID tries channel first, then signal. Use channel:<id> to force hardware output, signal:<id> or command:<id> to force signal publish.';
  actionsOn.closest('.form-grid')?.insertAdjacentElement('afterend',note);
}

function getSequenceIds(){
  return Object.keys(state.sequences?.sequences||{});
}

function renderSequenceStateTargetOptions(sequenceId=''){
  const targetSequenceId=sequenceId||state.ui.sequenceSelected||'';
  const states=state.sequences?.sequences?.[targetSequenceId]?.states||{};
  const stateOptions=Object.keys(states).map(id=>'<option value="'+id+'">'+id+' - '+(states[id].label||id)+'</option>').join('');
  ['sequenceInitialState','sequenceFaultState','sequenceDoneState','sequenceStateTimeoutTo','sequenceTransitionTo'].forEach(id=>{
    if(!$(id))return;
    const currentValue=$(id).value||'';
    $(id).innerHTML='<option value="">Нет</option>'+stateOptions;
    $(id).value=currentValue&&states[currentValue]?currentValue:'';
  });
}

function ensureSequenceSelections(preferredSequenceId='', preferredStateId='', preferredTransitionId=''){
  const sequenceIds=getSequenceIds();
  const nextSequence=preferredSequenceId||(state.ui.sequenceSelected&&sequenceIds.includes(state.ui.sequenceSelected)?state.ui.sequenceSelected:'')||(sequenceIds[0]||'');
  state.ui.sequenceSelected=nextSequence;

  if($('sequenceSelect'))$('sequenceSelect').innerHTML='<option value="">Новая sequence</option>'+sequenceIds.map(id=>'<option value="'+id+'">'+id+'</option>').join('');
  if($('sequenceStateParent'))$('sequenceStateParent').innerHTML=sequenceIds.map(id=>'<option value="'+id+'">'+id+'</option>').join('');
  if($('sequenceTransitionParent'))$('sequenceTransitionParent').innerHTML=sequenceIds.map(id=>'<option value="'+id+'">'+id+'</option>').join('');

  if($('sequenceSelect'))$('sequenceSelect').value=nextSequence;
  if($('sequenceStateParent'))$('sequenceStateParent').value=nextSequence;
  if($('sequenceTransitionParent'))$('sequenceTransitionParent').value=nextSequence;

  const states=state.sequences?.sequences?.[nextSequence]?.states||{};
  const stateIds=Object.keys(states);
  const nextState=preferredStateId||(state.ui.sequenceStateSelected&&stateIds.includes(state.ui.sequenceStateSelected)?state.ui.sequenceStateSelected:'')||(stateIds[0]||'');
  state.ui.sequenceStateSelected=nextState;

  if($('sequenceStateSelect'))$('sequenceStateSelect').innerHTML='<option value="">Новый state</option>'+stateIds.map(id=>'<option value="'+id+'">'+id+'</option>').join('');
  if($('sequenceTransitionState'))$('sequenceTransitionState').innerHTML=stateIds.map(id=>'<option value="'+id+'">'+id+'</option>').join('');
  if($('sequenceStateSelect'))$('sequenceStateSelect').value=nextState;
  if($('sequenceTransitionState'))$('sequenceTransitionState').value=nextState;

  const transitions=states[nextState]?.transitions||{};
  const transitionIds=Object.keys(transitions);
  const nextTransition=preferredTransitionId||(state.ui.sequenceTransitionSelected&&transitionIds.includes(state.ui.sequenceTransitionSelected)?state.ui.sequenceTransitionSelected:'')||(transitionIds[0]||'');
  state.ui.sequenceTransitionSelected=nextTransition;

  if($('sequenceTransitionSelect'))$('sequenceTransitionSelect').innerHTML='<option value="">Новый transition</option>'+transitionIds.map(id=>'<option value="'+id+'">'+id+'</option>').join('');
  if($('sequenceTransitionSelect'))$('sequenceTransitionSelect').value=nextTransition;
  renderSequenceStateTargetOptions(nextSequence);
}

function resetSequenceForm(){
  ensureSequenceSelections();
  $('sequenceId').value='';
  $('sequenceLabel').value='';
  $('sequenceEnableSignal').value='';
  $('sequenceStartSignal').value='';
  $('sequenceTripSignal').value='';
  $('sequenceResetSignal').value='';
  $('sequenceInitialState').value='';
  $('sequenceFaultState').value='';
  $('sequenceDoneState').value='';
  $('sequenceAutoStart').checked=true;
  $('sequenceSaveStatus').textContent='Создай новую sequence или открой существующую.';
}

function editSequence(sequenceId){
  const sequence=state.sequences?.sequences?.[sequenceId];
  if(!sequence)return;
  ensureSequenceSelections(sequenceId);
  $('sequenceId').value=sequenceId;
  $('sequenceLabel').value=sequence.label||sequenceId;
  renderSequenceSignalOptions();
  $('sequenceEnableSignal').value=sequence.enable_signal||'';
  $('sequenceStartSignal').value=sequence.start_signal||'';
  $('sequenceTripSignal').value=sequence.trip_signal||'';
  $('sequenceResetSignal').value=sequence.reset_signal||'';
  $('sequenceInitialState').value=sequence.initial_state||'';
  $('sequenceFaultState').value=sequence.fault_state||'';
  $('sequenceDoneState').value=sequence.done_state||'';
  $('sequenceAutoStart').checked=sequence.auto_start!==false;
  $('sequenceSaveStatus').textContent='Редактирование sequence '+sequenceId;
}

function resetSequenceStateForm(sequenceId=''){
  ensureSequenceSelections(sequenceId||state.ui.sequenceSelected);
  $('sequenceStateId').value='';
  $('sequenceStateLabel').value='';
  $('sequenceStatePermissive').value='';
  $('sequenceStateTimeoutMs').value='0';
  $('sequenceStateTimeoutTo').value='';
  $('sequenceStateActionsOn').value='';
  $('sequenceStateActionsOff').value='';
  $('sequenceStateSaveStatus').textContent='Создай новый state или открой существующий.';
}

function editSequenceState(sequenceId,stateId){
  const stateDef=state.sequences?.sequences?.[sequenceId]?.states?.[stateId];
  if(!stateDef)return;
  ensureSequenceSelections(sequenceId,stateId);
  $('sequenceStateParent').value=sequenceId;
  $('sequenceStateId').value=stateId;
  $('sequenceStateLabel').value=stateDef.label||stateId;
  renderSequenceSignalOptions();
  $('sequenceStatePermissive').value=stateDef.permissive_signal||'';
  $('sequenceStateTimeoutMs').value=String(stateDef.timeout_ms??0);
  $('sequenceStateTimeoutTo').value=stateDef.timeout_to||'';
  $('sequenceStateActionsOn').value=(stateDef.actions_on||[]).join(', ');
  $('sequenceStateActionsOff').value=(stateDef.actions_off||[]).join(', ');
  $('sequenceStateSaveStatus').textContent='Редактирование state '+stateId;
}

function resetSequenceTransitionForm(sequenceId='',stateId=''){
  ensureSequenceSelections(sequenceId||state.ui.sequenceSelected,stateId||state.ui.sequenceStateSelected);
  $('sequenceTransitionId').value='';
  $('sequenceTransitionLabel').value='';
  $('sequenceTransitionTo').value='';
  $('sequenceTransitionWhen').value='';
  $('sequenceTransitionDelayMs').value='0';
  $('sequenceTransitionInvert').checked=false;
  $('sequenceTransitionSaveStatus').textContent='Создай новый transition или открой существующий.';
}

function editSequenceTransition(sequenceId,stateId,transitionId){
  const transition=state.sequences?.sequences?.[sequenceId]?.states?.[stateId]?.transitions?.[transitionId];
  if(!transition)return;
  ensureSequenceSelections(sequenceId,stateId,transitionId);
  $('sequenceTransitionParent').value=sequenceId;
  $('sequenceTransitionState').value=stateId;
  $('sequenceTransitionId').value=transitionId;
  $('sequenceTransitionLabel').value=transition.label||transitionId;
  $('sequenceTransitionTo').value=transition.to||'';
  renderSequenceSignalOptions();
  $('sequenceTransitionWhen').value=transition.when_signal||'';
  $('sequenceTransitionDelayMs').value=String(transition.delay_ms??0);
  $('sequenceTransitionInvert').checked=!!transition.invert;
  $('sequenceTransitionSaveStatus').textContent='Редактирование transition '+transitionId;
}

async function saveSequenceDefinition(){
  $('sequenceSaveStatus').textContent='Сохраняю sequence...';
  const payload={
    sequence_id:$('sequenceId').value.trim(),
    label:$('sequenceLabel').value.trim(),
    enable_signal:$('sequenceEnableSignal').value,
    start_signal:$('sequenceStartSignal').value,
    trip_signal:$('sequenceTripSignal').value,
    reset_signal:$('sequenceResetSignal').value,
    initial_state:$('sequenceInitialState').value.trim(),
    fault_state:$('sequenceFaultState').value.trim(),
    done_state:$('sequenceDoneState').value.trim(),
    auto_start:$('sequenceAutoStart').checked
  };
  if(!payload.sequence_id){$('sequenceSaveStatus').textContent='Нужен sequence ID';return;}
  try{
    const r=await getJson(SEQUENCE_API.sequenceDefinition||'/sequence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const refreshOk=await refreshSequenceSurface();
    editSequence(payload.sequence_id);
    $('sequenceSaveStatus').textContent=refreshOk?(r.message||'Sequence сохранена'):'Sequence сохранена с предупреждениями обновления';
  }catch(e){
    $('sequenceSaveStatus').textContent='Save failed: '+e.message;
  }
}

async function deleteSequenceDefinition(sequenceId){
  const targetId=sequenceId||$('sequenceId').value.trim();
  if(!targetId){$('sequenceSaveStatus').textContent='Сначала выбери sequence';return;}
  $('sequenceSaveStatus').textContent='Удаляю sequence...';
  try{
    const r=await getJson(SEQUENCE_API.sequenceDelete||'/sequence-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sequence_id:targetId})});
    const refreshOk=await refreshSequenceSurface();
    resetSequenceForm();
    resetSequenceStateForm();
    resetSequenceTransitionForm();
    $('sequenceSaveStatus').textContent=refreshOk?(r.message||'Sequence удалена'):'Sequence удалена с предупреждениями обновления';
  }catch(e){
    $('sequenceSaveStatus').textContent='Delete failed: '+e.message;
  }
}

async function resetSequenceRuntimeNow(sequenceId){
  const targetId=sequenceId||$('sequenceId').value.trim();
  if(!targetId){$('sequenceSaveStatus').textContent='Сначала выбери sequence';return;}
  $('sequenceSaveStatus').textContent='Сбрасываю sequence...';
  try{
    const r=await getJson(SEQUENCE_API.sequenceReset||'/sequence-reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sequence_id:targetId})});
    state.sequences=await getJson(SEQUENCE_API.sequences||'/sequences');
    renderSequences();
    $('sequenceSaveStatus').textContent=r.message||'Sequence сброшена';
  }catch(e){
    $('sequenceSaveStatus').textContent='Reset failed: '+e.message;
  }
}

async function saveSequenceState(){
  $('sequenceStateSaveStatus').textContent='Сохраняю state...';
  const payload={
    sequence_id:$('sequenceStateParent').value,
    state_id:$('sequenceStateId').value.trim(),
    label:$('sequenceStateLabel').value.trim(),
    permissive_signal:$('sequenceStatePermissive').value,
    timeout_ms:parseInt($('sequenceStateTimeoutMs').value,10)||0,
    timeout_to:$('sequenceStateTimeoutTo').value.trim(),
    actions_on:parseSequenceActions($('sequenceStateActionsOn').value),
    actions_off:parseSequenceActions($('sequenceStateActionsOff').value)
  };
  if(!payload.sequence_id||!payload.state_id){$('sequenceStateSaveStatus').textContent='Нужны sequence и state ID';return;}
  try{
    const r=await getJson(SEQUENCE_API.sequenceState||'/sequence-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const refreshOk=await refreshSequenceSurface();
    editSequenceState(payload.sequence_id,payload.state_id);
    $('sequenceStateSaveStatus').textContent=refreshOk?(r.message||'State сохранён'):'State сохранён с предупреждениями обновления';
  }catch(e){
    $('sequenceStateSaveStatus').textContent='Save failed: '+e.message;
  }
}

async function deleteSequenceState(sequenceId,stateId){
  const targetSequence=sequenceId||$('sequenceStateParent').value;
  const targetState=stateId||$('sequenceStateId').value.trim();
  if(!targetSequence||!targetState){$('sequenceStateSaveStatus').textContent='Сначала выбери state';return;}
  $('sequenceStateSaveStatus').textContent='Удаляю state...';
  try{
    const r=await getJson(SEQUENCE_API.sequenceStateDelete||'/sequence-state-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sequence_id:targetSequence,state_id:targetState})});
    const refreshOk=await refreshSequenceSurface();
    resetSequenceStateForm(targetSequence);
    resetSequenceTransitionForm(targetSequence);
    $('sequenceStateSaveStatus').textContent=refreshOk?(r.message||'State удалён'):'State удалён с предупреждениями обновления';
  }catch(e){
    $('sequenceStateSaveStatus').textContent='Delete failed: '+e.message;
  }
}

async function saveSequenceTransition(){
  $('sequenceTransitionSaveStatus').textContent='Сохраняю transition...';
  const payload={
    sequence_id:$('sequenceTransitionParent').value,
    state_id:$('sequenceTransitionState').value,
    transition_id:$('sequenceTransitionId').value.trim(),
    label:$('sequenceTransitionLabel').value.trim(),
    to:$('sequenceTransitionTo').value.trim(),
    when_signal:$('sequenceTransitionWhen').value,
    delay_ms:parseInt($('sequenceTransitionDelayMs').value,10)||0,
    invert:$('sequenceTransitionInvert').checked
  };
  if(!payload.sequence_id||!payload.state_id||!payload.transition_id){$('sequenceTransitionSaveStatus').textContent='Нужны sequence, state и transition ID';return;}
  if(!payload.to||!payload.when_signal){$('sequenceTransitionSaveStatus').textContent='Нужны target state и when signal';return;}
  try{
    const r=await getJson(SEQUENCE_API.sequenceTransition||'/sequence-transition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const refreshOk=await refreshSequenceSurface();
    editSequenceTransition(payload.sequence_id,payload.state_id,payload.transition_id);
    $('sequenceTransitionSaveStatus').textContent=refreshOk?(r.message||'Transition сохранён'):'Transition сохранён с предупреждениями обновления';
  }catch(e){
    $('sequenceTransitionSaveStatus').textContent='Save failed: '+e.message;
  }
}

async function deleteSequenceTransition(sequenceId,stateId,transitionId){
  const targetSequence=sequenceId||$('sequenceTransitionParent').value;
  const targetState=stateId||$('sequenceTransitionState').value;
  const targetTransition=transitionId||$('sequenceTransitionId').value.trim();
  if(!targetSequence||!targetState||!targetTransition){$('sequenceTransitionSaveStatus').textContent='Сначала выбери transition';return;}
  $('sequenceTransitionSaveStatus').textContent='Удаляю transition...';
  try{
    const r=await getJson(SEQUENCE_API.sequenceTransitionDelete||'/sequence-transition-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sequence_id:targetSequence,state_id:targetState,transition_id:targetTransition})});
    const refreshOk=await refreshSequenceSurface();
    resetSequenceTransitionForm(targetSequence,targetState);
    $('sequenceTransitionSaveStatus').textContent=refreshOk?(r.message||'Transition удалён'):'Transition удалён с предупреждениями обновления';
  }catch(e){
    $('sequenceTransitionSaveStatus').textContent='Delete failed: '+e.message;
  }
}

function renderSequences(){
  ensureSequenceActionSemanticsUi();
  ensureActuatorSequenceTemplateUi();
  renderSequenceSignalOptions();
  renderActuatorSequenceTemplateOptions();
  const sequences=state.sequences?.sequences||{};
  ensureSequenceSelections();
  renderSequenceStateTargetOptions();
  if($('sequenceCount'))$('sequenceCount').textContent=String(state.sequences?.sequence_count??Object.keys(sequences).length);
  if($('sequenceRunningCount'))$('sequenceRunningCount').textContent=String(state.sequences?.running_count??0);
  if($('sequenceFaultCount'))$('sequenceFaultCount').textContent=String(state.sequences?.fault_count??0);
  if($('sequenceDoneCount'))$('sequenceDoneCount').textContent=String(state.sequences?.done_count??0);
  if($('sequenceEventCount'))$('sequenceEventCount').textContent=String((state.sequences?.recent_events||[]).length);

  const rows=Object.entries(sequences).map(([id,sequence])=>{
    const flags=[];
    if(sequence.enable_signal)flags.push('enable '+sequence.enable_signal);
    if(sequence.start_signal)flags.push('start '+sequence.start_signal);
    if(sequence.trip_signal)flags.push('trip '+sequence.trip_signal);
    if(sequence.reset_signal)flags.push('reset '+sequence.reset_signal);
    const pendingTransition=(sequence.pending_transition_label||sequence.pending_transition||'');
    const delayInfo=pendingTransition?(pendingTransition+(sequence.pending_transition_delay_ms?(' / '+String(sequence.pending_transition_elapsed_ms||0)+' / '+String(sequence.pending_transition_delay_ms)+' ms'):'')):'-';
    return '<tr><td><strong>'+escapeHtml(sequence.label||id)+'</strong><div class="muted-line">'+escapeHtml(id)+'</div></td><td>'+sequenceStatusPill(sequence)+'<div class="muted-line">'+escapeHtml(sequenceReasonText(sequence))+'</div></td><td>'+escapeHtml(sequence.current_state_label||sequence.current_state||'-')+'</td><td>'+escapeHtml(delayInfo)+'</td><td>'+(flags.length?escapeHtml(flags.join(' / ')):'-')+'</td><td><div class="row-actions"><button data-edit-sequence="'+id+'">Edit</button><button data-reset-sequence="'+id+'">Reset</button><button data-delete-sequence="'+id+'">Delete</button></div></td></tr>';
  }).join('');
  $('sequencesTable').innerHTML=rows||'<tr><td colspan="6">No sequences configured</td></tr>';

  const selectedSequence=state.ui.sequenceSelected;
  const sequence=selectedSequence?sequences[selectedSequence]:null;
  const states=sequence?.states||{};
  const stateRows=Object.entries(states).map(([stateId,stateDef])=>{
    const actions=[...(stateDef.actions_on||[]).map(item=>'ON '+item),...(stateDef.actions_off||[]).map(item=>'OFF '+item)];
    return '<tr><td>'+escapeHtml(stateId)+'</td><td>'+(stateDef.active?'<span class="status-pill ok">active</span>':'-')+'</td><td>'+escapeHtml(stateDef.permissive_signal||'-')+'</td><td>'+String(stateDef.timeout_ms??0)+' ms</td><td>'+escapeHtml(stateDef.timeout_to||'-')+'</td><td>'+(actions.length?escapeHtml(actions.join(', ')):'-')+'</td><td><div class="row-actions"><button data-edit-sequence-state="'+selectedSequence+'|'+stateId+'">Edit</button><button data-delete-sequence-state="'+selectedSequence+'|'+stateId+'">Delete</button></div></td></tr>';
  }).join('');
  $('sequenceStatesTable').innerHTML=stateRows||'<tr><td colspan="7">No states for selected sequence</td></tr>';

  const selectedState=state.ui.sequenceStateSelected;
  const transitions=states[selectedState]?.transitions||{};
  const transitionRows=Object.entries(transitions).map(([transitionId,transition])=>{
    const delayState=transition.active_delay?'<span class="status-pill pending">delay</span><div class="muted-line">'+String(transition.delay_elapsed_ms??0)+' / '+String(transition.delay_ms??0)+' ms</div>':'-';
    return '<tr><td>'+escapeHtml(transitionId)+'</td><td>'+delayState+'</td><td>'+escapeHtml(transition.when_signal||'-')+(transition.invert?' / invert':'')+'</td><td>'+String(transition.delay_ms??0)+' ms</td><td>'+escapeHtml(transition.to||'-')+'</td><td><div class="row-actions"><button data-edit-sequence-transition="'+selectedSequence+'|'+selectedState+'|'+transitionId+'">Edit</button><button data-delete-sequence-transition="'+selectedSequence+'|'+selectedState+'|'+transitionId+'">Delete</button></div></td></tr>';
  }).join('');
  $('sequenceTransitionsTable').innerHTML=transitionRows||'<tr><td colspan="6">No transitions for selected state</td></tr>';

  const eventRows=(state.sequences?.recent_events||[]).slice().reverse().map(eventRecord=>{
    return '<tr><td>'+String(eventRecord.timestamp_ms??0)+'</td><td>'+escapeHtml(eventRecord.sequence_id||'-')+'</td><td>'+escapeHtml(eventRecord.type||'-')+'</td><td>'+escapeHtml((eventRecord.from_state||'-')+' -> '+(eventRecord.to_state||'-'))+'</td><td>'+escapeHtml(eventRecord.text||'-')+'</td></tr>';
  }).join('');
  $('sequenceEventsTable').innerHTML=eventRows||'<tr><td colspan="5">No sequence events yet</td></tr>';
}

(function(){
function ensureActuatorSequenceTemplateUi(){
  if($('sequenceSeedActuator')) return;
  const sequenceActions=$('newSequence')?.parentElement;
  if(sequenceActions){
    const btn=document.createElement('button');
    btn.id='sequenceSeedActuator';
    btn.className='ghost';
    btn.textContent='Шаблон actuator+feedback';
    sequenceActions.appendChild(btn);
  }
  const editorCard=$('sequenceId')?.closest('.section-card');
  if(!editorCard) return;
  const card=document.createElement('div');
  card.id='sequenceActuatorTemplateCard';
  card.className='section-card';
  card.style.marginTop='12px';
  card.innerHTML=
    '<h3>Шаблон actuator + feedback</h3>'+
    '<div class="readonly-note" style="margin-top:10px">Готовый сценарий: команда включения, ожидание feedback, удержание в run, останов по stop signal и fault при потере feedback.</div>'+
    '<div class="form-grid" style="margin-top:12px">'+
      '<label>ID sequence<input id="sequenceTemplateId" class="mono-input" type="text" placeholder="pump_cycle"></label>'+
      '<label>Label<input id="sequenceTemplateLabel" type="text" placeholder="Pump cycle"></label>'+
      '<label>Enable signal<select id="sequenceTemplateEnableSignal"></select></label>'+
      '<label>Start signal<select id="sequenceTemplateStartSignal"></select></label>'+
      '<label>Stop signal<select id="sequenceTemplateStopSignal"></select></label>'+
      '<label>Trip signal<select id="sequenceTemplateTripSignal"></select></label>'+
      '<label>Reset signal<select id="sequenceTemplateResetSignal"></select></label>'+
      '<label>Permissive signal<select id="sequenceTemplatePermissiveSignal"></select></label>'+
      '<label>Feedback signal<select id="sequenceTemplateFeedbackSignal"></select></label>'+
      '<label>Command target<select id="sequenceTemplateCommandTarget"></select></label>'+
      '<label>Start timeout (ms)<input id="sequenceTemplateTimeoutMs" type="number" min="100" step="100" value="5000"></label>'+
      '<label>Feedback loss delay (ms)<input id="sequenceTemplateFeedbackLossMs" type="number" min="0" step="100" value="500"></label>'+
    '</div>'+
    '<div class="actions" style="margin-top:12px">'+
      '<button id="sequenceApplyActuatorTemplate" class="primary">Создать sequence-шаблон</button>'+
      '<span id="sequenceTemplateStatus">Выбери start, stop, feedback и command target. Остальное можно доработать потом в editor.</span>'+
    '</div>';
  editorCard.insertAdjacentElement('afterend',card);
}

function buildSequenceTemplateSignalOptions(){
  return Object.entries(state.signals?.signals||{})
    .map(([id,signal])=>'<option value="'+id+'">'+id+' - '+(signal.label||id)+'</option>')
    .join('');
}

function buildSequenceTemplateCommandOptions(){
  const channelOptions=Object.keys(state.channels?.channels||{}).map(id=>'<option value="channel:'+id+'">'+id+' [channel]</option>').join('');
  const signalOptions=Object.entries(state.signals?.signals||{})
    .filter(([,signal])=>signal.direction==='output' || signal.direction==='command' || signal.backing==='derived')
    .map(([id,signal])=>'<option value="signal:'+id+'">'+id+' ['+(signal.direction||signal.class||'signal')+']</option>')
    .join('');
  return channelOptions+signalOptions;
}

window.ensureActuatorSequenceTemplateUi=ensureActuatorSequenceTemplateUi;

window.renderActuatorSequenceTemplateOptions=function(){
  ensureActuatorSequenceTemplateUi();
  const signalOptions='<option value="">Нет</option>'+buildSequenceTemplateSignalOptions();
  ['sequenceTemplateEnableSignal','sequenceTemplateStartSignal','sequenceTemplateStopSignal','sequenceTemplateTripSignal','sequenceTemplateResetSignal','sequenceTemplatePermissiveSignal','sequenceTemplateFeedbackSignal'].forEach(id=>{
    if($(id))$(id).innerHTML=signalOptions;
  });
  if($('sequenceTemplateCommandTarget')){
    $('sequenceTemplateCommandTarget').innerHTML='<option value="">Выбери target</option>'+buildSequenceTemplateCommandOptions();
  }
};

window.seedActuatorSequenceTemplate=async function(){
  ensureActuatorSequenceTemplateUi();
  const sequenceId=($('sequenceTemplateId')?.value||'').trim();
  const label=($('sequenceTemplateLabel')?.value||'').trim()||sequenceId;
  const startSignal=$('sequenceTemplateStartSignal')?.value||'';
  const stopSignal=$('sequenceTemplateStopSignal')?.value||'';
  const feedbackSignal=$('sequenceTemplateFeedbackSignal')?.value||'';
  const commandTarget=$('sequenceTemplateCommandTarget')?.value||'';
  const timeoutMs=parseInt($('sequenceTemplateTimeoutMs')?.value||'5000',10)||5000;
  const feedbackLossMs=parseInt($('sequenceTemplateFeedbackLossMs')?.value||'500',10)||0;
  if(!sequenceId){$('sequenceTemplateStatus').textContent='Нужен sequence ID';return;}
  if(!startSignal){$('sequenceTemplateStatus').textContent='Нужен start signal';return;}
  if(!stopSignal){$('sequenceTemplateStatus').textContent='Нужен stop signal';return;}
  if(!feedbackSignal){$('sequenceTemplateStatus').textContent='Нужен feedback signal';return;}
  if(!commandTarget){$('sequenceTemplateStatus').textContent='Нужен command target';return;}
  $('sequenceTemplateStatus').textContent='Создаю actuator+feedback sequence...';
  try{
await getJson(SEQUENCE_API.sequenceDefinition||'/sequence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      sequence_id:sequenceId,
      label,
      enable_signal:$('sequenceTemplateEnableSignal')?.value||'',
      start_signal:startSignal,
      trip_signal:$('sequenceTemplateTripSignal')?.value||'',
      reset_signal:$('sequenceTemplateResetSignal')?.value||'',
      initial_state:'start_cmd',
      fault_state:'fault',
      done_state:'done',
      auto_start:false
    })});
await getJson(SEQUENCE_API.sequenceState||'/sequence-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      sequence_id:sequenceId,
      state_id:'start_cmd',
      label:'Start command',
      permissive_signal:$('sequenceTemplatePermissiveSignal')?.value||'',
      timeout_ms:timeoutMs,
      timeout_to:'fault',
      actions_on:[commandTarget],
      actions_off:[]
    })});
await getJson(SEQUENCE_API.sequenceState||'/sequence-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      sequence_id:sequenceId,
      state_id:'run',
      label:'Run',
      permissive_signal:'',
      timeout_ms:0,
      timeout_to:'',
      actions_on:[commandTarget],
      actions_off:[]
    })});
await getJson(SEQUENCE_API.sequenceState||'/sequence-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      sequence_id:sequenceId,
      state_id:'done',
      label:'Done',
      permissive_signal:'',
      timeout_ms:0,
      timeout_to:'',
      actions_on:[],
      actions_off:[commandTarget]
    })});
await getJson(SEQUENCE_API.sequenceState||'/sequence-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      sequence_id:sequenceId,
      state_id:'fault',
      label:'Fault',
      permissive_signal:'',
      timeout_ms:0,
      timeout_to:'',
      actions_on:[],
      actions_off:[commandTarget]
    })});
await getJson(SEQUENCE_API.sequenceTransition||'/sequence-transition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      sequence_id:sequenceId,
      state_id:'start_cmd',
      transition_id:'to_run',
      label:'Feedback reached',
      to:'run',
      when_signal:feedbackSignal,
      delay_ms:0,
      invert:false
    })});
await getJson(SEQUENCE_API.sequenceTransition||'/sequence-transition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      sequence_id:sequenceId,
      state_id:'run',
      transition_id:'to_done',
      label:'Stop command',
      to:'done',
      when_signal:stopSignal,
      delay_ms:0,
      invert:false
    })});
await getJson(SEQUENCE_API.sequenceTransition||'/sequence-transition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      sequence_id:sequenceId,
      state_id:'run',
      transition_id:'feedback_lost',
      label:'Feedback lost',
      to:'fault',
      when_signal:feedbackSignal,
      delay_ms:feedbackLossMs,
      invert:true
    })});
    await refreshSequenceSurface();
    editSequence(sequenceId);
    editSequenceState(sequenceId,'start_cmd');
    editSequenceTransition(sequenceId,'start_cmd','to_run');
    $('sequenceTemplateStatus').textContent='Actuator+feedback template создан. Теперь можно допилить permissive, timeout и service-логику в editor.';
  }catch(e){
    $('sequenceTemplateStatus').textContent='Template failed: '+e.message;
  }
};
})();
