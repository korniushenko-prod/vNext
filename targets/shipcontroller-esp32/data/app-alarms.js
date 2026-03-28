function renderAlarmSignalOptions(){
  const signalOptions=Object.entries(state.signals?.signals||{})
    .map(([id,signal])=>'<option value="'+id+'">'+id+' - '+(signal.label||id)+'</option>')
    .join('');
  if($('alarmSourceSignal'))$('alarmSourceSignal').innerHTML='<option value="">Выбери сигнал</option>'+signalOptions;
  if($('alarmEnableSignal'))$('alarmEnableSignal').innerHTML='<option value="">Нет</option>'+signalOptions;
}

function alarmSeverityLabel(severity){
  const isRu=getUiLanguage()==='ru';
  if(severity==='critical')return isRu?'Critical':'Critical';
  if(severity==='warning')return isRu?'Warning':'Warning';
  if(severity==='info')return isRu?'Info':'Info';
  return severity||'-';
}

function alarmSeverityPill(severity){
  const tone=severity==='critical'?'bad':severity==='warning'?'warn':'info';
  return '<span class="status-pill '+tone+'">'+escapeHtml(alarmSeverityLabel(severity))+'</span>';
}

function alarmStatusKey(alarm){
  if(alarm?.suppressed)return 'suppressed';
  if(alarm?.pending)return 'pending';
  if(alarm?.active&&alarm?.ack_required&&alarm?.acknowledged)return 'acknowledged';
  if(alarm?.active)return 'active';
  if(alarm?.status==='latched')return 'latched';
  return alarm?.status||'idle';
}

function alarmStatusLabel(status){
  const isRu=getUiLanguage()==='ru';
  if(status==='active')return isRu?'Активна':'Active';
  if(status==='pending')return isRu?'Ожидание':'Pending';
  if(status==='acknowledged')return isRu?'Подтверждена':'Acknowledged';
  if(status==='latched')return isRu?'Удерживается':'Latched';
  if(status==='suppressed')return isRu?'Подавлена':'Suppressed';
  if(status==='idle')return isRu?'Норма':'Idle';
  return status||'-';
}

function alarmStatusPill(alarm){
  const status=alarmStatusKey(alarm);
  const tone=status==='active'?'bad':status==='pending'?'pending':status==='acknowledged'?'ok':status==='idle'?'ok':status==='suppressed'?'info':'warn';
  return '<span class="status-pill '+tone+'">'+escapeHtml(alarmStatusLabel(status))+'</span>';
}

function alarmAckPill(alarm){
  const isRu=getUiLanguage()==='ru';
  if(!alarm?.ack_required){
    return '<span class="status-pill info">'+(isRu?'Авто':'Auto')+'</span>';
  }
  if(alarm?.active&&!alarm?.acknowledged){
    return '<span class="status-pill bad">'+(isRu?'Нужен ack':'Needs ack')+'</span>';
  }
  return '<span class="status-pill ok">'+(isRu?'Подтверждена':'Acked')+'</span>';
}

function alarmEventTypeLabel(type){
  const isRu=getUiLanguage()==='ru';
  if(type==='active')return isRu?'Сработала':'Active';
  if(type==='clear')return isRu?'Сброс':'Clear';
  if(type==='ack')return isRu?'Ack':'Ack';
  return type||'-';
}

function alarmEventTypePill(type){
  const tone=type==='active'?'bad':type==='clear'?'ok':'info';
  return '<span class="status-pill '+tone+'">'+escapeHtml(alarmEventTypeLabel(type))+'</span>';
}

function alarmMatchesFilter(alarm, filter){
  if(filter==='active')return !!(alarm?.active||alarm?.pending);
  if(filter==='unacked')return !!(alarm?.ack_required&&alarm?.active&&!alarm?.acknowledged);
  if(filter==='critical')return alarm?.severity==='critical';
  if(filter==='warning')return alarm?.severity==='warning';
  return true;
}

function alarmFilterLabel(filter){
  const isRu=getUiLanguage()==='ru';
  if(filter==='active')return isRu?'активные и pending':'active and pending';
  if(filter==='unacked')return isRu?'ждущие ack':'awaiting ack';
  if(filter==='critical')return 'critical';
  if(filter==='warning')return 'warning';
  return isRu?'все':'all';
}

function resetAlarmForm(){
  $('alarmId').value='';
  $('alarmLabel').value='';
  renderAlarmSignalOptions();
  $('alarmSourceSignal').value='';
  $('alarmEnableSignal').value='';
  $('alarmSeverity').value='warning';
  $('alarmDelayMs').value='0';
  $('alarmLatched').checked=false;
  $('alarmAckRequired').checked=true;
  $('alarmSaveStatus').textContent='Создай новую alarm-правило или открой существующее.';
}

function editAlarm(id){
  const alarm=state.alarms?.alarms?.[id];
  if(!alarm)return;
  renderAlarmSignalOptions();
  $('alarmId').value=id;
  $('alarmLabel').value=alarm.label||id;
  $('alarmSourceSignal').value=alarm.source_signal||'';
  $('alarmEnableSignal').value=alarm.enable_signal||'';
  $('alarmSeverity').value=alarm.severity||'warning';
  $('alarmDelayMs').value=String(alarm.delay_ms??0);
  $('alarmLatched').checked=!!alarm.latched;
  $('alarmAckRequired').checked=!!alarm.ack_required;
  $('alarmSaveStatus').textContent='Редактирование alarm '+id;
}

async function saveAlarmDefinition(){
  $('alarmSaveStatus').textContent='Сохраняю alarm...';
  const payload={
    alarm_id:$('alarmId').value.trim(),
    label:$('alarmLabel').value.trim(),
    source_signal:$('alarmSourceSignal').value,
    enable_signal:$('alarmEnableSignal').value,
    severity:$('alarmSeverity').value,
    delay_ms:parseInt($('alarmDelayMs').value,10)||0,
    latched:$('alarmLatched').checked,
    ack_required:$('alarmAckRequired').checked
  };
  if(!payload.alarm_id){$('alarmSaveStatus').textContent='Нужен alarm ID';return;}
  if(!payload.source_signal){$('alarmSaveStatus').textContent='Нужен source signal';return;}
  try{
    const r=await getJson('/alarm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    await loadAll();
    $('alarmSaveStatus').textContent=r.message||'Alarm сохранена';
  }catch(e){
    $('alarmSaveStatus').textContent='Save failed: '+e.message;
  }
}

async function deleteAlarmDefinition(id){
  const alarmId=id||$('alarmId').value.trim();
  if(!alarmId){$('alarmSaveStatus').textContent='Сначала выбери alarm';return;}
  if(!confirm('Удалить alarm '+alarmId+'?'))return;
  $('alarmSaveStatus').textContent='Удаляю alarm...';
  try{
    const r=await getJson('/alarm-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({alarm_id:alarmId})});
    await loadAll();
    resetAlarmForm();
    $('alarmSaveStatus').textContent=r.message||'Alarm удалена';
  }catch(e){
    $('alarmSaveStatus').textContent='Delete failed: '+e.message;
  }
}

async function ackAlarm(alarmId){
  if(!alarmId)return;
  $('alarmSaveStatus').textContent='Подтверждаю alarm...';
  try{
    const r=await getJson('/alarm-ack',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({alarm_id:alarmId})});
    state.alarms=await getJson('/alarms');
    renderAlarms();
    $('alarmSaveStatus').textContent=r.message||'Alarm подтверждена';
  }catch(e){
    $('alarmSaveStatus').textContent='Ack failed: '+e.message;
  }
}

async function ackAllAlarms(){
  $('alarmSaveStatus').textContent='Подтверждаю все alarms...';
  try{
    const r=await getJson('/alarm-ack',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({all:true})});
    state.alarms=await getJson('/alarms');
    renderAlarms();
    $('alarmSaveStatus').textContent=r.message||'Все alarms подтверждены';
  }catch(e){
    $('alarmSaveStatus').textContent='Ack failed: '+e.message;
  }
}

function renderAlarms(){
  renderAlarmSignalOptions();
  const isRu=getUiLanguage()==='ru';
  const alarms=state.alarms?.alarms||{};
  const alarmEntries=Object.entries(alarms);
  const events=state.alarms?.recent_events||[];
  const filter=state.ui.alarmFilter||'active';
  if($('alarmViewFilter'))$('alarmViewFilter').value=filter;

  const activeEntries=alarmEntries.filter(([,alarm])=>alarm.active||alarm.pending);
  const filteredEntries=alarmEntries.filter(([,alarm])=>alarmMatchesFilter(alarm,filter));

  if($('alarmCount'))$('alarmCount').textContent=String(state.alarms?.alarm_count??alarmEntries.length);
  if($('activeAlarmCount'))$('activeAlarmCount').textContent=String(state.alarms?.active_count??activeEntries.filter(([,alarm])=>alarm.active).length);
  if($('pendingAlarmCount'))$('pendingAlarmCount').textContent=String(state.alarms?.pending_count??alarmEntries.filter(([,alarm])=>alarm.pending).length);
  if($('unackedAlarmCount'))$('unackedAlarmCount').textContent=String(state.alarms?.unacked_count??alarmEntries.filter(([,alarm])=>alarm.ack_required&&alarm.active&&!alarm.acknowledged).length);
  if($('alarmEventCount'))$('alarmEventCount').textContent=String(events.length);

  if($('activeAlarmSummary')){
    const latest=state.alarms?.latest_active_label||'';
    $('activeAlarmSummary').textContent=activeEntries.length
      ? ((isRu?'Сейчас видны active и pending alarms. Последняя активная: ':'Showing active and pending alarms. Latest active: ')+(latest||'-'))
      : (isRu?'Сейчас нет active/pending alarms.':'There are no active/pending alarms right now.');
  }
  if($('alarmsTableSummary')){
    $('alarmsTableSummary').textContent=(isRu?'Фильтр: ':'Filter: ')+alarmFilterLabel(filter)+'. '+(isRu?'Показано ':'Showing ')+filteredEntries.length+' / '+alarmEntries.length+'.';
  }
  if($('alarmEventsSummary')){
    const latestEvent=events.length?events[events.length-1]:null;
    $('alarmEventsSummary').textContent=latestEvent
      ? ((isRu?'Последнее событие: ':'Latest event: ')+(latestEvent.alarm_id||'-')+' / '+alarmEventTypeLabel(latestEvent.type))
      : (isRu?'Журнал пока пустой.':'Event log is empty so far.');
  }

  const activeRows=activeEntries.map(([id,alarm])=>{
    const labelHtml='<div><strong>'+escapeHtml(alarm.label||id)+'</strong><div class="muted-line">'+escapeHtml(id)+'</div></div>';
    return '<tr><td>'+escapeHtml(id)+'</td><td>'+labelHtml+'</td><td>'+alarmSeverityPill(alarm.severity)+'</td><td>'+alarmStatusPill(alarm)+'</td><td>'+alarmAckPill(alarm)+'</td><td><div class="row-actions"><button data-ack-alarm="'+id+'">Ack</button><button data-edit-alarm="'+id+'">Edit</button></div></td></tr>';
  }).join('');
  $('activeAlarmsTable').innerHTML=activeRows||'<tr><td colspan="6">'+(isRu?'Нет активных alarms':'No active alarms')+'</td></tr>';

  const allRows=filteredEntries.map(([id,alarm])=>{
    const flags=[];
    if(alarm.latched)flags.push(isRu?'latched':'latched');
    if(alarm.ack_required)flags.push('ack');
    if(alarm.enable_signal)flags.push((isRu?'enable ':'enable ')+alarm.enable_signal);
    const sourceBits=[];
    sourceBits.push(alarm.source_signal||'-');
    if(alarm.source_exists===false)sourceBits.push(isRu?'нет source':'missing source');
    if(alarm.enable_exists===false)sourceBits.push(isRu?'нет enable':'missing enable');
    const statusHtml=alarmStatusPill(alarm)+' '+alarmAckPill(alarm)+'<div class="muted-line" style="margin-top:6px">'+escapeHtml(alarm.status||'-')+'</div>';
    return '<tr><td>'+escapeHtml(id)+'</td><td><strong>'+escapeHtml(alarm.label||id)+'</strong></td><td>'+escapeHtml(sourceBits.join(' / '))+'</td><td>'+alarmSeverityPill(alarm.severity)+'</td><td>'+String(alarm.delay_ms??0)+' ms</td><td>'+(flags.length?escapeHtml(flags.join(', ')):'-')+'</td><td>'+statusHtml+'</td><td><div class="row-actions"><button data-edit-alarm="'+id+'">Edit</button><button data-delete-alarm="'+id+'">Delete</button></div></td></tr>';
  }).join('');
  $('alarmsTable').innerHTML=allRows||'<tr><td colspan="8">'+(isRu?'Нет alarms под текущий фильтр':'No alarms match the current filter')+'</td></tr>';

  const eventRows=events.slice().reverse().map(eventRecord=>{
    return '<tr><td>'+String(eventRecord.timestamp_ms??0)+'</td><td>'+escapeHtml(eventRecord.alarm_id||'-')+'</td><td>'+alarmEventTypePill(eventRecord.type)+'</td><td>'+alarmSeverityPill(eventRecord.severity)+'</td><td>'+escapeHtml(eventRecord.text||'-')+'</td></tr>';
  }).join('');
  $('alarmEventsTable').innerHTML=eventRows||'<tr><td colspan="5">'+(isRu?'Событий пока нет':'No events yet')+'</td></tr>';
}
