// Communications foundation UI logic

const DEVICE_TEMPLATE_DEFS={
  generic:{
    deviceNote:(ctx)=>'Выбери driver и шину. Для готовых шаблонов будут доступны рекомендуемые поля и быстрые действия.',
    resourceNote:(ctx)=>'Выбери устройство и опиши, какой канал оно экспортирует. Для готовых шаблонов здесь появятся рекомендуемые значения и подсказки.',
    supportsVirtualFields:false,
    seedLabel:'',
    seedTemplate:'',
    describeDevice:(device)=>{
      const detailBits=['addr '+(device.address??0),'poll '+(device.poll_ms??0)+' ms'];
      if(device.online)detailBits.push('online');
      if(device.last_ok_ms)detailBits.push('ok '+device.last_ok_ms+' ms');
      return detailBits.join(', ');
    },
    devicePreset:null,
    resourcePreset:null
  },
  ads1115:{
    deviceNote:(ctx)=>{
      let note='ADS1115 v1: выбери I2C-шину, обычно адрес 72 (0x48), а потом можно одной кнопкой создать ch0..ch3. Если нужен нестандартный набор, ресурсы всё ещё можно добавить вручную.';
      if(ctx.busLabel)note+=' Текущая шина: '+ctx.busLabel+'.';
      return note;
    },
    resourceNote:(ctx)=>{
      let note='Для ADS1115 используй kind = analog_in, capability = ai и source index 0..3. Сейчас это первый реальный внешний AI.';
      if(!(ctx.kind==='analog_in'&&ctx.capability==='ai'))note+=' Для этого драйвера текущая комбинация kind/capability не подходит.';
      if(ctx.sourceIndex<0||ctx.sourceIndex>3)note+=' Source index должен быть в диапазоне 0..3.';
      return note;
    },
    supportsVirtualFields:false,
    seedLabel:'Создать ch0..ch3',
    seedTemplate:'ads1115_channels',
    describeDevice:(device)=>{
      const detailBits=['addr '+(device.address??0),'poll '+(device.poll_ms??0)+' ms'];
      if(device.online)detailBits.push('online');
      if(device.last_ok_ms)detailBits.push('ok '+device.last_ok_ms+' ms');
      return detailBits.join(', ');
    },
    devicePreset:(ctx)=>({
      address:'72',
      pollMs:'500',
      timeoutMs:'200',
      retryCount:'1',
      label:ctx.currentLabel||'ADS1115',
      status:'Подставлены рекомендуемые поля для ADS1115. Дальше сохрани устройство и создай ch0..ch3.'
    }),
    resourcePreset:(ctx)=>({
      kind:'analog_in',
      capability:'ai',
      sourceIndex:String(ctx.nextIndex),
      resourceId:ctx.currentId||ctx.deviceId+'.ch'+ctx.nextIndex,
      label:ctx.currentLabel||(ctx.deviceLabel+' ch'+ctx.nextIndex),
      status:'Подставлены рекомендуемые поля для ads1115. Теперь можно сохранить ресурс или сразу пойти в Bind.'
    })
  },
  mcp4728:{
    deviceNote:(ctx)=>{
      let note='MCP4728 v1: выбери I2C-шину, обычно адрес 96 (0x60). Это первый внешний DAC-шаблон для analog_out / ao по общей модели.';
      if(ctx.busLabel)note+=' Текущая шина: '+ctx.busLabel+'.';
      return note;
    },
    resourceNote:(ctx)=>{
      let note='Для MCP4728 используй kind = analog_out, capability = ao и source index 0..3. Каждый ресурс — отдельный DAC-канал.';
      if(!(ctx.kind==='analog_out'&&ctx.capability==='ao'))note+=' Для этого драйвера текущая комбинация kind/capability не подходит.';
      if(ctx.sourceIndex<0||ctx.sourceIndex>3)note+=' Source index должен быть в диапазоне 0..3.';
      return note;
    },
    supportsVirtualFields:false,
    seedLabel:'Создать DAC ch0..ch3',
    seedTemplate:'mcp4728_channels',
    describeDevice:(device)=>{
      const detailBits=['addr '+(device.address??0),'poll '+(device.poll_ms??0)+' ms'];
      if(device.online)detailBits.push('online');
      if(device.last_ok_ms)detailBits.push('ok '+device.last_ok_ms+' ms');
      return detailBits.join(', ');
    },
    devicePreset:(ctx)=>({
      address:'96',
      pollMs:'0',
      timeoutMs:'200',
      retryCount:'1',
      label:ctx.currentLabel||'MCP4728',
      status:'Подставлены рекомендуемые поля для MCP4728. Дальше сохрани устройство и создай DAC ch0..ch3.'
    }),
    resourcePreset:(ctx)=>({
      kind:'analog_out',
      capability:'ao',
      sourceIndex:String(ctx.nextIndex),
      resourceId:ctx.currentId||ctx.deviceId+'.ch'+ctx.nextIndex,
      label:ctx.currentLabel||(ctx.deviceLabel+' ch'+ctx.nextIndex),
      status:'Подставлены рекомендуемые поля для mcp4728. Теперь можно сохранить ресурс и привязать его к AO channel.'
    })
  },
  modbus_rtu:{
    deviceNote:(ctx)=>{
      let note='Modbus RTU v1: используй UART или RS485 bus. Поле Address — это slave id устройства. Для v1 поддерживается один активный serial bus, как и у I2C свой primary bus.';
      if(ctx.busLabel)note+=' Текущая шина: '+ctx.busLabel+'.';
      return note;
    },
    resourceNote:(ctx)=>{
      let note='Для Modbus RTU v1 используй zero-based адрес в Source index. Сейчас поддерживаются: register/ai -> Input Register (FC04), register/ao -> Holding Register (FC03/FC06), coil/di -> Discrete Input (FC02), coil/do -> Coil (FC01/FC05).';
      if(ctx.kind==='register'&&(ctx.capability==='di'||ctx.capability==='do'))note+=' Для register в v1 используй ai или ao.';
      if(ctx.kind==='coil'&&(ctx.capability==='ai'||ctx.capability==='ao'))note+=' Для coil в v1 используй di или do.';
      return note;
    },
    supportsVirtualFields:false,
    seedLabel:'',
    seedTemplate:'',
    resourceModes:[
      {id:'input_register_ai',label:'Input Reg AI',kind:'register',capability:'ai',idPrefix:'ir_',labelPrefix:'Input Reg'},
      {id:'holding_register_ao',label:'Holding Reg AO',kind:'register',capability:'ao',idPrefix:'hr_',labelPrefix:'Holding Reg'},
      {id:'discrete_input_di',label:'Discrete In DI',kind:'coil',capability:'di',idPrefix:'di_',labelPrefix:'Discrete In'},
      {id:'coil_do',label:'Coil DO',kind:'coil',capability:'do',idPrefix:'coil_',labelPrefix:'Coil'}
    ],
    describeDevice:(device)=>{
      const detailBits=['slave '+(device.address??1),'poll '+(device.poll_ms??0)+' ms'];
      if(device.online)detailBits.push('online');
      if(device.last_ok_ms)detailBits.push('ok '+device.last_ok_ms+' ms');
      return detailBits.join(', ');
    },
    devicePreset:(ctx)=>({
      address:'1',
      pollMs:'500',
      timeoutMs:'200',
      retryCount:'1',
      label:ctx.currentLabel||'Modbus RTU',
      status:'Подставлены рекомендуемые поля для Modbus RTU. Дальше сохрани устройство и добавь register/coil ресурсы вручную.'
    }),
    resourcePreset:(ctx)=>({
      kind:'register',
      capability:'ai',
      sourceIndex:String(ctx.nextIndex),
      resourceId:ctx.currentId||ctx.deviceId+'.reg_'+String(ctx.nextIndex).padStart(5,'0'),
      label:ctx.currentLabel||(ctx.deviceLabel+' reg '+ctx.nextIndex),
      status:'Подставлены стартовые поля для Modbus RTU. Проверь kind/capability и адрес перед сохранением.'
    })
  },
  virtual_ai:{
    deviceNote:(ctx)=>{
      let note='virtual_ai v1: это тестовое внешнее аналоговое устройство без железа. Оно публикует 4 канала raw-значений и помогает проверять весь путь Comms -> Channels -> Signals -> Display.';
      if(ctx.busLabel)note+=' Сейчас используется шина '+ctx.busLabel+', но для virtual_ai это только часть общей модели.';
      return note;
    },
    resourceNote:(ctx)=>{
      let note='Для virtual_ai используй kind = analog_in, capability = ai и source index по номеру канала. Это тестовый шаблон для полного пути external analog без железа.';
      if(!(ctx.kind==='analog_in'&&ctx.capability==='ai'))note+=' Для этого драйвера текущая комбинация kind/capability не подходит.';
      return note;
    },
    supportsVirtualFields:true,
    seedLabel:'Создать virtual ch0..ch3',
    seedTemplate:'virtual_ai_channels',
    describeDevice:(device)=>{
      const detailBits=['addr '+(device.address??0),'poll '+(device.poll_ms??0)+' ms','mode '+(device.virtual_mode||'triangle')];
      if(device.online)detailBits.push('online');
      if(device.last_ok_ms)detailBits.push('ok '+device.last_ok_ms+' ms');
      return detailBits.join(', ');
    },
    devicePreset:(ctx)=>({
      address:'0',
      pollMs:'250',
      timeoutMs:'100',
      retryCount:'0',
      label:ctx.currentLabel||'Virtual Analog',
      virtualMode:'triangle',
      virtualMinRaw:'0',
      virtualMaxRaw:'32767',
      virtualManualRaw:'12000',
      virtualPeriodMs:'4000',
      status:'Подставлены рекомендуемые поля для virtual_ai. Можно сразу создавать virtual ch0..ch3.'
    }),
    resourcePreset:(ctx)=>({
      kind:'analog_in',
      capability:'ai',
      sourceIndex:String(ctx.nextIndex),
      resourceId:ctx.currentId||ctx.deviceId+'.ch'+ctx.nextIndex,
      label:ctx.currentLabel||(ctx.deviceLabel+' ch'+ctx.nextIndex),
      status:'Подставлены рекомендуемые поля для virtual_ai. Теперь можно сохранить ресурс или сразу пойти в Bind.'
    })
  }
};

function getDeviceTemplateDef(driver){
  return DEVICE_TEMPLATE_DEFS[(driver||'generic').trim().toLowerCase()]||null;
}

function buildDeviceTemplateContext(driver){
  return{
    driver:(driver||$('deviceDriver')?.value||'generic').trim().toLowerCase(),
    busLabel:$('deviceBusId')?.value||''
  };
}

function renderBusTypeVisibility(){
  const type=$('busType')?.value||'i2c';
  const isI2c=type==='i2c';
  const isRs485=type==='rs485';
  $('busI2cFields')?.classList.toggle('hidden',!isI2c);
  $('busSerialFields')?.classList.toggle('hidden',isI2c);
  $('busDePinWrap')?.classList.toggle('hidden',!isRs485);
}

function renderDeviceBusOptions(){
  const buses=Object.entries(state.buses?.buses||{});
  const options=buses.map(([id,bus])=>'<option value="'+id+'">'+id+' - '+(bus.label||id)+' ('+(bus.type||'-')+')</option>').join('');
  if($('deviceBusId'))$('deviceBusId').innerHTML=options||'<option value="">Нет шин</option>';
}

function renderDeviceDriverOptions(selectedDriver='generic'){
  const known=Object.keys(DEVICE_TEMPLATE_DEFS);
  const existing=Object.values(state.devices?.devices||{}).map(device=>(device.driver||'').trim().toLowerCase()).filter(Boolean);
  const current=(selectedDriver||$('deviceDriver')?.value||'generic').trim().toLowerCase();
  const drivers=[...new Set([...known,...existing,current])];
  if(!$('deviceDriver'))return;
  $('deviceDriver').innerHTML=drivers.map(driver=>'<option value="'+driver+'">'+driver+'</option>').join('');
  $('deviceDriver').value=current;
}

function renderExternalResourceDeviceOptions(){
  const devices=Object.entries(state.devices?.devices||{});
  const options=devices.map(([id,device])=>'<option value="'+id+'">'+id+' - '+(device.label||id)+' ('+(device.driver||'-')+')</option>').join('');
  if($('externalResourceDeviceId'))$('externalResourceDeviceId').innerHTML=options||'<option value="">Нет устройств</option>';
}

function updateDeviceDriverNote(){
  const driver=($('deviceDriver')?.value||'').trim().toLowerCase();
  const template=getDeviceTemplateDef(driver);
  const note=template?.deviceNote?template.deviceNote(buildDeviceTemplateContext(driver)):('Драйвер '+driver+' пока описан только как общее устройство. Реальный polling сейчас реализован для ADS1115.');
  if($('deviceDriverNote'))$('deviceDriverNote').textContent=note;
  $('seedDeviceResources')?.classList.toggle('hidden',!template?.seedLabel);
  if($('seedDeviceResources'))$('seedDeviceResources').textContent=template?.seedLabel||'Создать ch0..ch3';
  $('deviceVirtualFields')?.classList.toggle('hidden',!template?.supportsVirtualFields);
  renderDeviceResourceModeActions(driver);
}

function renderDeviceResourceModeActions(driver){
  const template=getDeviceTemplateDef(driver);
  const modes=template?.resourceModes||[];
  $('deviceResourceModeCard')?.classList.toggle('hidden',modes.length===0);
  if($('deviceResourceModeNote')){
    $('deviceResourceModeNote').textContent=modes.length
      ? 'Можно сразу открыть новый внешний ресурс уже с готовым типом и начальным адресом.'
      : 'Для некоторых драйверов здесь появятся готовые типы ресурсов.';
  }
  if($('deviceResourceModeActions')){
    $('deviceResourceModeActions').innerHTML=modes.map(mode=>'<button class="ghost" data-device-resource-mode="'+mode.id+'">'+mode.label+'</button>').join('');
  }
}

function applyDeviceDriverPreset(){
  const driver=($('deviceDriver')?.value||'').trim().toLowerCase();
  const template=getDeviceTemplateDef(driver);
  const preset=template?.devicePreset?template.devicePreset({currentLabel:$('deviceLabel')?.value?.trim?.()||''}):null;
  if(!preset){
    $('deviceStatus').textContent='Для этого driver пока нет специальных рекомендуемых полей.';
    updateDeviceDriverNote();
    return;
  }
  $('deviceAddress').value=preset.address??$('deviceAddress').value;
  $('devicePollMs').value=preset.pollMs??$('devicePollMs').value;
  $('deviceTimeoutMs').value=preset.timeoutMs??$('deviceTimeoutMs').value;
  $('deviceRetryCount').value=preset.retryCount??$('deviceRetryCount').value;
  if(!$('deviceLabel').value.trim()&&preset.label)$('deviceLabel').value=preset.label;
  if(template.supportsVirtualFields){
    $('deviceVirtualMode').value=preset.virtualMode??$('deviceVirtualMode').value;
    $('deviceVirtualMinRaw').value=preset.virtualMinRaw??$('deviceVirtualMinRaw').value;
    $('deviceVirtualMaxRaw').value=preset.virtualMaxRaw??$('deviceVirtualMaxRaw').value;
    $('deviceVirtualManualRaw').value=preset.virtualManualRaw??$('deviceVirtualManualRaw').value;
    $('deviceVirtualPeriodMs').value=preset.virtualPeriodMs??$('deviceVirtualPeriodMs').value;
  }
  $('deviceStatus').textContent=preset.status||'Рекомендуемые поля подставлены.';
  updateDeviceDriverNote();
}

function prefillExternalResourceFromCurrentDevice(){
  const deviceId=$('deviceId')?.value?.trim?.()||'';
  if(!deviceId){
    $('deviceStatus').textContent='Сначала открой существующее устройство или задай его ID.';
    return;
  }
  const device=state.devices?.devices?.[deviceId]||{driver:($('deviceDriver')?.value||'generic'),label:($('deviceLabel')?.value||deviceId)};
  const tabBtn=document.querySelector('.tabs button[data-tab="comms"]');
  if(tabBtn)tabBtn.click();
  resetExternalResourceForm();
  renderExternalResourceDeviceOptions();
  $('externalResourceDeviceId').value=deviceId;
  applyExternalResourcePreset();
  $('externalResourceStatus').textContent='Новый внешний ресурс подготовлен для устройства '+deviceId+'. Проверь поля и сохрани его.';
}

function prefillExternalResourceFromCurrentDeviceMode(modeId){
  const deviceId=$('deviceId')?.value?.trim?.()||'';
  if(!deviceId){
    $('deviceStatus').textContent='Сначала открой существующее устройство или задай его ID.';
    return;
  }
  prefillExternalResourceFromCurrentDevice();
  applyExternalResourceModePreset(modeId);
  $('externalResourceStatus').textContent='Новый внешний ресурс подготовлен из профиля устройства. Проверь адрес и сохрани его.';
}

function prefillExternalResourceFromDeviceId(deviceId){
  if(!deviceId){
    $('deviceStatus').textContent='Сначала выбери устройство.';
    return;
  }
  const device=state.devices?.devices?.[deviceId];
  if(!device){
    $('deviceStatus').textContent='Устройство '+deviceId+' ещё не найдено в runtime.';
    return;
  }
  const tabBtn=document.querySelector('.tabs button[data-tab="comms"]');
  if(tabBtn)tabBtn.click();
  resetExternalResourceForm();
  renderExternalResourceDeviceOptions();
  $('externalResourceDeviceId').value=deviceId;
  applyExternalResourcePreset();
  $('externalResourceStatus').textContent='Новый внешний ресурс подготовлен для устройства '+deviceId+'. Проверь поля и сохрани его.';
}

function updateExternalResourceNote(){
  const deviceId=$('externalResourceDeviceId')?.value||'';
  const device=state.devices?.devices?.[deviceId];
  const driver=(device?.driver||'').toLowerCase();
  const kind=$('externalResourceKind')?.value||'analog_in';
  const capability=$('externalResourceCapability')?.value||'ai';
  const sourceIndex=parseInt($('externalResourceSourceIndex')?.value||'0',10);
  const resourceId=$('externalResourceId')?.value?.trim?.()||'';
  const links=resourceId?getExternalResourceLinks(resourceId):null;
  const template=getDeviceTemplateDef(driver);
  let note=template?.resourceNote?template.resourceNote({deviceId,kind,capability,sourceIndex}):('Устройство '+deviceId+' использует driver '+driver+'. Общая модель уже есть, но специальных resource-подсказок для него пока нет.');
  if(links?.channelId)note+=' Ресурс уже привязан к channel '+links.channelId+'.';
  if(links?.signalId)note+=' Он публикуется через signal '+links.signalId+'.';
  if(links?.displayHits?.length)note+=' На display он используется '+links.displayHits.length+' раз.';
  if($('externalResourceDriverNote'))$('externalResourceDriverNote').textContent=note;
  renderExternalResourceModeActions(driver);
  const isAo=capability==='ao';
  const isDo=capability==='do';
  $('externalResourceWriteCard')?.classList.toggle('hidden',!(isAo||isDo));
  $('externalResourceWriteAnalogFields')?.classList.toggle('hidden',!isAo);
  $('externalResourceWriteAnalogActions')?.classList.toggle('hidden',!isAo);
  $('externalResourceWriteDigitalFields')?.classList.toggle('hidden',!isDo);
  if($('externalResourceWriteTitle')){
    $('externalResourceWriteTitle').textContent=isDo?'Быстрая запись DO':'Быстрая запись AO';
  }
  if($('externalResourceWriteNote')){
    $('externalResourceWriteNote').textContent=isAo
      ? ((driver==='mcp4728')
          ? 'Для MCP4728 v1 можно быстро отправить raw 0..4095 прямо в устройство. Это удобно для первичной проверки DAC-канала до полной логики.'
          : (driver==='modbus_rtu'
              ? 'Для Modbus RTU register/ao можно быстро отправить raw прямо в holding register и сразу проверить статус ресурса.'
              : 'Для AO-ресурса можно сразу отправить тестовый raw в устройство и посмотреть, как меняется статус ресурса.'))
      : (isDo
          ? (driver==='modbus_rtu'
              ? 'Для Modbus RTU coil/do можно сразу отправить OFF или ON прямо в coil и проверить статус ресурса.'
              : 'Для DO-ресурса можно сразу отправить OFF или ON в устройство и посмотреть, как меняется статус ресурса.')
          : 'Быстрая запись доступна только для ao/do ресурсов.');
  }
  if(isAo&&$('externalResourceTestRaw')){
    const current=String($('externalResourceTestRaw').value||'');
    if(current===''||current==='0'){
      $('externalResourceTestRaw').value='0';
    }
  }
}

function renderExternalResourceModeActions(driver){
  const template=getDeviceTemplateDef(driver);
  const modes=template?.resourceModes||[];
  $('externalResourceModeCard')?.classList.toggle('hidden',modes.length===0);
  if($('externalResourceModeNote')){
    $('externalResourceModeNote').textContent=modes.length
      ? 'Выбери готовый профиль, если не хочется вручную собирать kind/capability и адрес ресурса.'
      : 'Для некоторых драйверов здесь появятся готовые профили ресурса.';
  }
  if($('externalResourceModeActions')){
    $('externalResourceModeActions').innerHTML=modes.map(mode=>'<button class="ghost" data-external-resource-mode="'+mode.id+'">'+mode.label+'</button>').join('');
  }
}

function getExternalResourceLinks(resourceId){
  const channelEntry=Object.entries(state.channels?.channels||{}).find(([,channel])=>channel.source_kind==='external'&&channel.resource===resourceId);
  const channelId=channelEntry?.[0]||'';
  const signalId=(channelId&&state.signals?.signals?.[channelId])?channelId:'';
  const displayHits=[];
  Object.entries(state.display?.screens||{}).forEach(([screenId,screen])=>{
    Object.entries(screen.widgets||{}).forEach(([widgetId,widget])=>{
      if(widget.signal===signalId||widget.visible_if===signalId)displayHits.push(screenId+':'+widgetId);
    });
  });
  return{channelId,signalId,displayHits};
}

function getDeviceUsageSummary(deviceId){
  const resources=Object.entries(state.externalResources?.external_resources||{}).filter(([,resource])=>resource.device_id===deviceId);
  let aiCount=0;
  let aoCount=0;
  let channelCount=0;
  let signalCount=0;
  let displayCount=0;
  resources.forEach(([resourceId,resource])=>{
    if(resource.capability==='ai')aiCount++;
    if(resource.capability==='ao')aoCount++;
    const links=getExternalResourceLinks(resourceId);
    if(links.channelId)channelCount++;
    if(links.signalId)signalCount++;
    displayCount+=links.displayHits.length;
  });
  return{
    resourceCount:resources.length,
    aiCount,
    aoCount,
    channelCount,
    signalCount,
    displayCount
  };
}

function describeExternalResourceType(resource, device){
  const driver=(device?.driver||'').trim().toLowerCase();
  if(driver==='modbus_rtu'){
    if(resource.kind==='register'&&resource.capability==='ai')return 'Input Register';
    if(resource.kind==='register'&&resource.capability==='ao')return 'Holding Register';
    if(resource.kind==='coil'&&resource.capability==='di')return 'Discrete Input';
    if(resource.kind==='coil'&&resource.capability==='do')return 'Coil';
  }
  if(resource.kind==='analog_in')return 'Analog In';
  if(resource.kind==='analog_out')return 'Analog Out';
  if(resource.kind==='digital_in')return 'Digital In';
  if(resource.kind==='digital_out')return 'Digital Out';
  return resource.kind||'-';
}

function describeExternalResourceMode(resource, device){
  const driver=(device?.driver||'').trim().toLowerCase();
  if(driver==='modbus_rtu'){
    if(resource.kind==='register'&&resource.capability==='ai')return 'read FC04';
    if(resource.kind==='register'&&resource.capability==='ao')return 'read/write FC03/FC06';
    if(resource.kind==='coil'&&resource.capability==='di')return 'read FC02';
    if(resource.kind==='coil'&&resource.capability==='do')return 'read/write FC01/FC05';
  }
  if(resource.capability==='ai'||resource.capability==='di')return 'read';
  if(resource.capability==='ao'||resource.capability==='do')return 'read/write';
  return '';
}

function suggestNextExternalIndex(deviceId){
  const resources=Object.values(state.externalResources?.external_resources||{}).filter(resource=>resource.device_id===deviceId);
  const used=new Set(resources.map(resource=>parseInt(resource.source_index,10)).filter(Number.isFinite));
  let idx=0;
  while(used.has(idx)&&idx<64)idx++;
  return idx;
}

function applyExternalResourcePreset(){
  const deviceId=$('externalResourceDeviceId')?.value||'';
  const device=state.devices?.devices?.[deviceId];
  const driver=(device?.driver||'').trim().toLowerCase();
  if(!deviceId||!device){
    $('externalResourceStatus').textContent='Сначала выбери устройство, для которого нужно экспортировать ресурс.';
    return;
  }
  const nextIndex=suggestNextExternalIndex(deviceId);
  const template=getDeviceTemplateDef(driver);
  const preset=template?.resourcePreset?template.resourcePreset({deviceId,deviceLabel:device.label||deviceId,nextIndex,currentId:$('externalResourceId')?.value?.trim?.()||'',currentLabel:$('externalResourceLabel')?.value?.trim?.()||''}):null;
  if(!preset){
    $('externalResourceStatus').textContent='Для driver '+(driver||'generic')+' пока нет готового resource-профиля. Поля оставлены ручными.';
    updateExternalResourceNote();
    return;
  }
  $('externalResourceKind').value=preset.kind??$('externalResourceKind').value;
  $('externalResourceCapability').value=preset.capability??$('externalResourceCapability').value;
  $('externalResourceSourceIndex').value=preset.sourceIndex??$('externalResourceSourceIndex').value;
  if(!$('externalResourceId').value.trim()&&preset.resourceId)$('externalResourceId').value=preset.resourceId;
  if(!$('externalResourceLabel').value.trim()&&preset.label)$('externalResourceLabel').value=preset.label;
  $('externalResourceStatus').textContent=preset.status||('Подставлены рекомендуемые поля для '+driver+'.');
  updateExternalResourceNote();
}

function applyExternalResourceModePreset(modeId){
  const deviceId=$('externalResourceDeviceId')?.value||'';
  const device=state.devices?.devices?.[deviceId];
  const driver=(device?.driver||'').trim().toLowerCase();
  if(!deviceId||!device){
    $('externalResourceStatus').textContent='Сначала выбери устройство, для которого нужно экспортировать ресурс.';
    return;
  }
  const template=getDeviceTemplateDef(driver);
  const mode=(template?.resourceModes||[]).find(item=>item.id===modeId);
  if(!mode){
    $('externalResourceStatus').textContent='Для этого драйвера такой профиль ресурса пока не поддерживается.';
    return;
  }
  const sourceIndex=parseInt($('externalResourceSourceIndex')?.value||String(suggestNextExternalIndex(deviceId)),10);
  const safeIndex=Number.isFinite(sourceIndex)?sourceIndex:0;
  $('externalResourceKind').value=mode.kind;
  $('externalResourceCapability').value=mode.capability;
  $('externalResourceSourceIndex').value=String(safeIndex);
  if(!$('externalResourceId').value.trim()){
    $('externalResourceId').value=deviceId+'.'+mode.idPrefix+String(safeIndex).padStart(5,'0');
  }
  if(!$('externalResourceLabel').value.trim()){
    $('externalResourceLabel').value=(device.label||deviceId)+' '+mode.labelPrefix+' '+safeIndex;
  }
  $('externalResourceStatus').textContent='Подставлен профиль '+mode.label+'. Проверь адрес и сохрани ресурс.';
  updateExternalResourceNote();
}

function bindCurrentExternalResource(){
  const resourceId=$('externalResourceId')?.value?.trim?.()||'';
  if(!resourceId){
    $('externalResourceStatus').textContent='Сначала задай ID внешнего ресурса.';
    return;
  }
  if(!state.externalResources?.external_resources?.[resourceId]){
    $('externalResourceStatus').textContent='Сначала сохрани внешний ресурс, потом можно сразу перейти в Bind.';
    return;
  }
  prefillChannelFromExternalResource(resourceId);
}

function editLinkedExternalResourceChannel(){
  const resourceId=$('externalResourceId')?.value?.trim?.()||'';
  if(!resourceId){
    $('externalResourceStatus').textContent='Сначала открой внешний ресурс.';
    return;
  }
  const links=getExternalResourceLinks(resourceId);
  if(!links.channelId){
    $('externalResourceStatus').textContent='У этого ресурса ещё нет связанного channel. Сначала используй Bind и сохрани канал.';
    return;
  }
  editChannel(links.channelId);
}

function showCurrentExternalResourceOnDisplay(){
  const resourceId=$('externalResourceId')?.value?.trim?.()||'';
  if(!resourceId){
    $('externalResourceStatus').textContent='Сначала задай ID внешнего ресурса.';
    return;
  }
  if(!state.externalResources?.external_resources?.[resourceId]){
    $('externalResourceStatus').textContent='Сначала сохрани внешний ресурс, потом можно сразу перейти в Display.';
    return;
  }
  prefillDisplayWidgetFromExternalResource(resourceId);
}

function resetBusForm(){
  $('busId').value='';
  $('busLabel').value='';
  $('busType').value='i2c';
  $('busEnabled').checked=true;
  $('busSda').value='21';
  $('busScl').value='22';
  $('busSpeed').value='400000';
  $('busScan').checked=true;
  $('busTx').value='17';
  $('busRx').value='16';
  $('busBaud').value='9600';
  $('busParity').value='none';
  $('busStopBits').value='1';
  $('busDePin').value='-1';
  $('busStatus').textContent='Создай новую шину или открой существующую.';
  renderBusTypeVisibility();
}

function editBus(id){
  const bus=state.buses?.buses?.[id];
  if(!bus)return;
  $('busId').value=id;
  $('busLabel').value=bus.label||id;
  $('busType').value=bus.type||'i2c';
  $('busEnabled').checked=!!bus.enabled;
  $('busSda').value=String(bus.sda??21);
  $('busScl').value=String(bus.scl??22);
  $('busSpeed').value=String(bus.speed??400000);
  $('busScan').checked=bus.scan!==false;
  $('busTx').value=String(bus.tx??17);
  $('busRx').value=String(bus.rx??16);
  $('busBaud').value=String(bus.baud??9600);
  $('busParity').value=bus.parity||'none';
  $('busStopBits').value=String(bus.stop_bits??1);
  $('busDePin').value=String(bus.de_pin??-1);
  $('busStatus').textContent='Редактирование шины '+id;
  renderBusTypeVisibility();
}

async function saveBus(){
  const payload={bus_id:$('busId').value.trim(),label:$('busLabel').value.trim(),type:$('busType').value,enabled:$('busEnabled').checked,sda:parseInt($('busSda').value,10),scl:parseInt($('busScl').value,10),speed:parseInt($('busSpeed').value,10),scan:$('busScan').checked,tx:parseInt($('busTx').value,10),rx:parseInt($('busRx').value,10),baud:parseInt($('busBaud').value,10),parity:$('busParity').value,stop_bits:parseInt($('busStopBits').value,10),de_pin:parseInt($('busDePin').value,10)};
  if(!payload.bus_id){$('busStatus').textContent='Нужен ID шины';return}
  $('busStatus').textContent='Сохраняю шину...';
  try{
    const r=await getJson('/bus',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const refreshOk=await refreshCommsSurface();
    $('busStatus').textContent=refreshOk?(r.message||'Шина сохранена'):'Шина сохранена с предупреждениями обновления';
  }catch(e){
    $('busStatus').textContent='Save failed: '+e.message;
  }
}

async function deleteBus(id){
  const busId=id||$('busId').value.trim();
  if(!busId){$('busStatus').textContent='Сначала выбери шину';return}
  if(!confirm('Удалить шину '+busId+'?'))return;
  $('busStatus').textContent='Удаляю шину...';
  try{
    const r=await getJson('/bus-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bus_id:busId})});
    const refreshOk=await refreshCommsSurface();
    resetBusForm();
    $('busStatus').textContent=refreshOk?(r.message||'Шина удалена'):'Шина удалена с предупреждениями обновления';
  }catch(e){
    $('busStatus').textContent='Delete failed: '+e.message;
  }
}

function resetDeviceForm(){
  renderDeviceBusOptions();
  renderDeviceDriverOptions('generic');
  $('deviceId').value='';
  $('deviceLabel').value='';
  $('deviceEnabled').checked=true;
  $('deviceAddress').value='0';
  $('devicePollMs').value='1000';
  $('deviceTimeoutMs').value='200';
  $('deviceRetryCount').value='1';
  $('deviceVirtualMode').value='triangle';
  $('deviceVirtualMinRaw').value='0';
  $('deviceVirtualMaxRaw').value='32767';
  $('deviceVirtualManualRaw').value='12000';
  $('deviceVirtualPeriodMs').value='4000';
  $('deviceStatus').textContent='Создай новое устройство или открой существующее.';
  updateDeviceDriverNote();
}

function resetExternalResourceForm(){
  renderExternalResourceDeviceOptions();
  $('externalResourceId').value='';
  $('externalResourceLabel').value='';
  $('externalResourceKind').value='analog_in';
  $('externalResourceCapability').value='ai';
  $('externalResourceSourceIndex').value='0';
  $('externalResourceUnits').value='';
  $('externalResourceStatus').textContent='Создай внешний ресурс или открой существующий.';
  updateExternalResourceNote();
}

function editDevice(id){
  const device=state.devices?.devices?.[id];
  if(!device)return;
  renderDeviceBusOptions();
  renderDeviceDriverOptions(device.driver||'generic');
  $('deviceId').value=id;
  $('deviceLabel').value=device.label||id;
  $('deviceBusId').value=device.bus_id||'';
  $('deviceEnabled').checked=!!device.enabled;
  $('deviceAddress').value=String(device.address??0);
  $('devicePollMs').value=String(device.poll_ms??1000);
  $('deviceTimeoutMs').value=String(device.timeout_ms??200);
  $('deviceRetryCount').value=String(device.retry_count??1);
  $('deviceVirtualMode').value=device.virtual_mode||'triangle';
  $('deviceVirtualMinRaw').value=String(device.virtual_min_raw??0);
  $('deviceVirtualMaxRaw').value=String(device.virtual_max_raw??32767);
  $('deviceVirtualManualRaw').value=String(device.virtual_manual_raw??12000);
  $('deviceVirtualPeriodMs').value=String(device.virtual_period_ms??4000);
  const usage=getDeviceUsageSummary(id);
  const usageBits=['resources '+usage.resourceCount];
  if(usage.aiCount)usageBits.push('ai '+usage.aiCount);
  if(usage.aoCount)usageBits.push('ao '+usage.aoCount);
  if(usage.channelCount)usageBits.push('channels '+usage.channelCount);
  if(usage.displayCount)usageBits.push('display '+usage.displayCount);
  $('deviceStatus').textContent='Редактирование устройства '+id+(usageBits.length?(' ('+usageBits.join(', ')+')'):'');
  updateDeviceDriverNote();
}

function editExternalResource(id){
  const resource=state.externalResources?.external_resources?.[id];
  if(!resource)return;
  renderExternalResourceDeviceOptions();
  $('externalResourceId').value=id;
  $('externalResourceLabel').value=resource.label||id;
  $('externalResourceDeviceId').value=resource.device_id||'';
  $('externalResourceKind').value=resource.kind||'analog_in';
  $('externalResourceCapability').value=resource.capability||'ai';
  $('externalResourceSourceIndex').value=String(resource.source_index??0);
  $('externalResourceUnits').value=resource.units||'';
  const links=getExternalResourceLinks(id);
  const linkBits=[];
  if(links.channelId)linkBits.push('channel '+links.channelId);
  if(links.signalId)linkBits.push('signal '+links.signalId);
  if(links.displayHits.length)linkBits.push('display '+links.displayHits.length);
  $('externalResourceStatus').textContent='Редактирование внешнего ресурса '+id+(linkBits.length?(' ('+linkBits.join(', ')+')'):'');
  updateExternalResourceNote();
}

function getExternalResourceWriteRange(){
  const deviceId=$('externalResourceDeviceId')?.value||'';
  const device=state.devices?.devices?.[deviceId];
  const driver=(device?.driver||'').toLowerCase();
  if(driver==='mcp4728')return{min:0,max:4095,mid:2048};
  return{min:0,max:255,mid:128};
}

function setExternalResourceWritePreset(kind){
  const range=getExternalResourceWriteRange();
  if(!$('externalResourceTestRaw'))return;
  if(kind==='min')$('externalResourceTestRaw').value=String(range.min);
  else if(kind==='mid')$('externalResourceTestRaw').value=String(range.mid);
  else $('externalResourceTestRaw').value=String(range.max);
}

async function writeExternalResourceNow(){
  const resourceId=$('externalResourceId')?.value?.trim?.()||'';
  if(!resourceId){
    $('externalResourceStatus').textContent='Сначала выбери внешний ресурс.';
    return;
  }
  if(!state.externalResources?.external_resources?.[resourceId]){
    $('externalResourceStatus').textContent='Сначала сохрани внешний ресурс, потом можно делать test write.';
    return;
  }
  const capability=(state.externalResources?.external_resources?.[resourceId]?.capability||$('externalResourceCapability')?.value||'').toLowerCase();
  $('externalResourceStatus').textContent='Отправляю test write...';
  try{
    const payload={resource_id:resourceId};
    if(capability==='ao'){
      const rawValue=parseInt($('externalResourceTestRaw')?.value||'0',10);
      if(!Number.isFinite(rawValue)){
        $('externalResourceStatus').textContent='Нужен корректный raw value.';
        return;
      }
      payload.raw_value=rawValue;
    }else if(capability==='do'){
      payload.digital_value=true;
    }else{
      $('externalResourceStatus').textContent='Быстрая запись сейчас поддерживается только для ao/do.';
      return;
    }
    const r=await getJson('/external-resource-write',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const refreshOk=await refreshCommsSurface();
    $('externalResourceStatus').textContent=refreshOk?(r.message||'Test write выполнен'):'Test write выполнен с предупреждениями обновления';
  }catch(e){
    $('externalResourceStatus').textContent='Write failed: '+e.message;
  }
}

async function writeExternalResourceDigital(value){
  const resourceId=$('externalResourceId')?.value?.trim?.()||'';
  if(!resourceId){
    $('externalResourceStatus').textContent='Сначала выбери внешний ресурс.';
    return;
  }
  if(!state.externalResources?.external_resources?.[resourceId]){
    $('externalResourceStatus').textContent='Сначала сохрани внешний ресурс, потом можно делать test write.';
    return;
  }
  $('externalResourceStatus').textContent='Отправляю test write...';
  try{
    const r=await getJson('/external-resource-write',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resource_id:resourceId,digital_value:!!value})});
    const refreshOk=await refreshCommsSurface();
    $('externalResourceStatus').textContent=refreshOk?(r.message||'Test write выполнен'):'Test write выполнен с предупреждениями обновления';
  }catch(e){
    $('externalResourceStatus').textContent='Write failed: '+e.message;
  }
}

async function saveDevice(){
  const payload={device_id:$('deviceId').value.trim(),label:$('deviceLabel').value.trim(),driver:$('deviceDriver').value.trim()||'generic',bus_id:$('deviceBusId').value,enabled:$('deviceEnabled').checked,address:parseInt($('deviceAddress').value,10),poll_ms:parseInt($('devicePollMs').value,10),timeout_ms:parseInt($('deviceTimeoutMs').value,10),retry_count:parseInt($('deviceRetryCount').value,10),virtual_mode:$('deviceVirtualMode').value,virtual_min_raw:parseInt($('deviceVirtualMinRaw').value,10),virtual_max_raw:parseInt($('deviceVirtualMaxRaw').value,10),virtual_manual_raw:parseInt($('deviceVirtualManualRaw').value,10),virtual_period_ms:parseInt($('deviceVirtualPeriodMs').value,10)};
  if(!payload.device_id){$('deviceStatus').textContent='Нужен ID устройства';return}
  $('deviceStatus').textContent='Сохраняю устройство...';
  try{
    const r=await getJson('/device',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const refreshOk=await refreshCommsSurface();
    $('deviceStatus').textContent=refreshOk?(r.message||'Устройство сохранено'):'Устройство сохранено с предупреждениями обновления';
  }catch(e){
    $('deviceStatus').textContent='Save failed: '+e.message;
  }
}

async function seedDeviceResources(){
  const deviceId=$('deviceId')?.value?.trim()||'';
  const driver=(($('deviceDriver')?.value||'').trim().toLowerCase());
  const templateDef=getDeviceTemplateDef(driver);
  if(!deviceId){$('deviceStatus').textContent='Сначала заполни или сохрани ID устройства';return}
  if(!templateDef?.seedTemplate){ $('deviceStatus').textContent='У этого driver пока нет шаблона автосоздания ресурсов'; return; }
  $('deviceStatus').textContent='Создаю ch0..ch3...';
  try{
    const r=await getJson('/device-seed-external-resources',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:deviceId,template:templateDef.seedTemplate})});
    const refreshOk=await refreshCommsSurface();
    $('deviceStatus').textContent=refreshOk?(r.message||'Ресурсы устройства созданы'):'Ресурсы устройства созданы с предупреждениями обновления';
  }catch(e){
    $('deviceStatus').textContent='Seed failed: '+e.message;
  }
}

async function seedDeviceResourcesFromId(deviceId){
  if(!deviceId){
    $('deviceStatus').textContent='Сначала выбери устройство.';
    return;
  }
  const device=state.devices?.devices?.[deviceId];
  const driver=((device?.driver||'').trim().toLowerCase());
  const templateDef=getDeviceTemplateDef(driver);
  if(!device){
    $('deviceStatus').textContent='Устройство '+deviceId+' ещё не найдено в runtime.';
    return;
  }
  if(!templateDef?.seedTemplate){
    $('deviceStatus').textContent='У driver '+(driver||'generic')+' пока нет шаблона автосоздания ресурсов';
    return;
  }
  $('deviceStatus').textContent='Создаю ресурсы для '+deviceId+'...';
  try{
    const r=await getJson('/device-seed-external-resources',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:deviceId,template:templateDef.seedTemplate})});
    const refreshOk=await refreshCommsSurface();
    $('deviceStatus').textContent=refreshOk?(r.message||('Ресурсы устройства '+deviceId+' созданы')):'Ресурсы устройства созданы с предупреждениями обновления';
  }catch(e){
    $('deviceStatus').textContent='Seed failed: '+e.message;
  }
}

async function deleteDevice(id){
  const deviceId=id||$('deviceId').value.trim();
  if(!deviceId){$('deviceStatus').textContent='Сначала выбери устройство';return}
  if(!confirm('Удалить устройство '+deviceId+'?'))return;
  $('deviceStatus').textContent='Удаляю устройство...';
  try{
    const r=await getJson('/device-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({device_id:deviceId})});
    const refreshOk=await refreshCommsSurface();
    resetDeviceForm();
    $('deviceStatus').textContent=refreshOk?(r.message||'Устройство удалено'):'Устройство удалено с предупреждениями обновления';
  }catch(e){
    $('deviceStatus').textContent='Delete failed: '+e.message;
  }
}

async function saveExternalResource(){
  const payload={resource_id:$('externalResourceId').value.trim(),label:$('externalResourceLabel').value.trim(),device_id:$('externalResourceDeviceId').value,kind:$('externalResourceKind').value,capability:$('externalResourceCapability').value,source_index:parseInt($('externalResourceSourceIndex').value,10),units:$('externalResourceUnits').value.trim()};
  if(!payload.resource_id){$('externalResourceStatus').textContent='Нужен ID внешнего ресурса';return}
  $('externalResourceStatus').textContent='Сохраняю внешний ресурс...';
  try{
    const r=await getJson('/external-resource',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const refreshOk=await refreshCommsSurface();
    $('externalResourceStatus').textContent=refreshOk?(r.message||'Внешний ресурс сохранён'):'Внешний ресурс сохранён с предупреждениями обновления';
  }catch(e){
    $('externalResourceStatus').textContent='Save failed: '+e.message;
  }
}

async function deleteExternalResource(id){
  const resourceId=id||$('externalResourceId').value.trim();
  if(!resourceId){$('externalResourceStatus').textContent='Сначала выбери внешний ресурс';return}
  if(!confirm('Удалить внешний ресурс '+resourceId+'?'))return;
  $('externalResourceStatus').textContent='Удаляю внешний ресурс...';
  try{
    const r=await getJson('/external-resource-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resource_id:resourceId})});
    const refreshOk=await refreshCommsSurface();
    resetExternalResourceForm();
    $('externalResourceStatus').textContent=refreshOk?(r.message||'Внешний ресурс удалён'):'Внешний ресурс удалён с предупреждениями обновления';
  }catch(e){
    $('externalResourceStatus').textContent='Delete failed: '+e.message;
  }
}

function renderComms(){
  const buses=Object.entries(state.buses?.buses||{});
  const devices=Object.entries(state.devices?.devices||{});
  const externalResources=Object.entries(state.externalResources?.external_resources||{});
  $('commsBusCount').textContent=String(state.runtime?.comms?.bus_count??buses.length??0);
  $('commsDeviceCount').textContent=String(state.runtime?.comms?.device_count??devices.length??0);
  if($('commsExternalResourceCount'))$('commsExternalResourceCount').textContent=String(state.runtime?.comms?.external_resource_count??externalResources.length??0);
  $('busesTable').innerHTML=buses.map(([id,bus])=>{
    const details=bus.type==='i2c'
      ? ('SDA '+(bus.sda??'-')+', SCL '+(bus.scl??'-')+', '+(bus.speed??'-')+' Hz')
      : ('TX '+(bus.tx??'-')+', RX '+(bus.rx??'-')+', '+(bus.baud??'-')+' baud'+(bus.type==='rs485'?(', DE '+(bus.de_pin??'-')):''));
    return '<tr><td>'+id+'</td><td>'+(bus.label||id)+'</td><td>'+bus.type+'</td><td>'+details+'</td><td>'+(bus.status||'-')+'</td><td><div class="row-actions"><button data-edit-bus="'+id+'">Edit</button><button data-delete-bus="'+id+'">Delete</button></div></td></tr>';
  }).join('')||'<tr><td colspan="6">Шины пока не настроены</td></tr>';
  $('devicesTable').innerHTML=devices.map(([id,device])=>{
    const template=getDeviceTemplateDef(device.driver||'generic');
    const details=template?.describeDevice?template.describeDevice(device):('addr '+(device.address??0)+', poll '+(device.poll_ms??0)+' ms');
    const usage=getDeviceUsageSummary(id);
    const usageBits=['resources '+usage.resourceCount];
    if(usage.aiCount)usageBits.push('ai '+usage.aiCount);
    if(usage.aoCount)usageBits.push('ao '+usage.aoCount);
    if(usage.channelCount)usageBits.push('channels '+usage.channelCount);
    if(usage.signalCount)usageBits.push('signals '+usage.signalCount);
    if(usage.displayCount)usageBits.push('display '+usage.displayCount);
    const quickActions=['<button data-edit-device="'+id+'">Edit</button>'];
    if(template?.seedTemplate)quickActions.push('<button data-seed-device="'+id+'">Seed</button>');
    quickActions.push('<button data-new-resource-for-device="'+id+'">Resource</button>');
    quickActions.push('<button data-delete-device="'+id+'">Delete</button>');
    return '<tr><td>'+id+'</td><td>'+(device.label||id)+'</td><td>'+(device.driver||'-')+'</td><td>'+(device.bus_id||'-')+'</td><td>'+details+'<div class="muted-line">'+usageBits.join(' | ')+'</div></td><td>'+(device.status||'-')+'</td><td><div class="row-actions">'+quickActions.join('')+'</div></td></tr>';
  }).join('')||'<tr><td colspan="7">Устройства пока не настроены</td></tr>';
  $('externalResourcesTable').innerHTML=externalResources.map(([id,resource])=>{
    const links=getExternalResourceLinks(id);
    const device=resource.device_id?state.devices?.devices?.[resource.device_id]:null;
    const humanType=describeExternalResourceType(resource,device);
    const modeText=describeExternalResourceMode(resource,device);
    const detailBits=['addr '+(resource.source_index??0)];
    if(device?.driver)detailBits.push(device.driver);
    if(modeText)detailBits.push(modeText);
    if(resource.units)detailBits.push(resource.units);
    if(resource.capability==='ai'||resource.capability==='ao')detailBits.push('raw '+(resource.raw_value??0));
    if(resource.capability==='di'||resource.capability==='do')detailBits.push('val '+((resource.digital_value??false)?'ON':'OFF'));
    if(resource.timestamp_ms)detailBits.push('t '+resource.timestamp_ms+' ms');
    const details=detailBits.join(', ');
    const linkBits=[];
    if(links.channelId)linkBits.push('channel '+links.channelId);
    if(links.signalId)linkBits.push('signal '+links.signalId);
    if(links.displayHits.length)linkBits.push('display '+links.displayHits.length);
    if(resource.capability==='ao'&&resource.status)linkBits.push('write '+resource.status);
    if(resource.capability==='do'&&resource.status)linkBits.push('write '+resource.status);
    const linkLine=linkBits.length?('<div class="muted-line">'+linkBits.join(' | ')+'</div>'):'';
    const statusText=(resource.status||'-')+(resource.quality?(' / '+resource.quality):'');
    return '<tr><td>'+id+'</td><td>'+(resource.label||id)+'</td><td>'+(resource.device_id||'-')+'</td><td>'+humanType+'</td><td>'+(resource.capability||'-')+'</td><td>'+details+linkLine+'</td><td>'+statusText+'</td><td><div class="row-actions"><button data-bind-external-resource="'+id+'">Bind</button><button data-show-external-resource="'+id+'">Display</button><button data-edit-external-resource="'+id+'">Edit</button><button data-delete-external-resource="'+id+'">Delete</button></div></td></tr>';
  }).join('')||'<tr><td colspan="8">Внешние ресурсы пока не настроены</td></tr>';
  renderDeviceDriverOptions();
  renderDeviceBusOptions();
  renderExternalResourceDeviceOptions();
  renderBusTypeVisibility();
  updateDeviceDriverNote();
  updateExternalResourceNote();
}
