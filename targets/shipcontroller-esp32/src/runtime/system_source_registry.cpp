#include "system_source_registry.h"

#include "../config/config.h"
#include "../core/board_manager.h"
#include "../runtime/alarm_manager.h"
#include "../runtime/sequence_manager.h"
#include "../web/web.h"

namespace {

const SystemSourceDefinition kSystemSources[] = {
    {"system.ip", "Система - IP адрес", "System - IP address"},
    {"system.wifi_mode", "Система - режим Wi-Fi", "System - Wi-Fi mode"},
    {"system.active_board", "Система - активная плата", "System - active board"},
    {"system.board_template", "Система - шаблон платы", "System - board template"},
    {"system.chip_template", "Система - шаблон чипа", "System - chip template"},
    {"system.alarm_active_count", "Аварии - активных", "Alarms - active count"},
    {"system.alarm_pending_count", "Аварии - pending", "Alarms - pending count"},
    {"system.alarm_unacked_count", "Аварии - ждут ack", "Alarms - unacked count"},
    {"system.alarm_latest", "Аварии - последняя активная", "Alarms - latest active"},
    {"system.alarm_latest_severity", "Аварии - severity последней", "Alarms - latest severity"},
    {"system.alarm_latest_status", "Аварии - статус последней", "Alarms - latest status"},
    {"system.sequence_running_count", "Sequences - running", "Sequences - running count"},
    {"system.sequence_fault_count", "Sequences - fault", "Sequences - fault count"},
    {"system.sequence_done_count", "Sequences - done", "Sequences - done count"},
    {"system.sequence_latest", "Sequences - последняя активная", "Sequences - latest active"},
    {"system.sequence_latest_state", "Sequences - текущий state", "Sequences - current state"},
    {"system.sequence_latest_status", "Sequences - статус", "Sequences - status"},
    {"system.sequence_latest_reason", "Sequences - причина / reason", "Sequences - reason"},
    {"system.sequence_latest_transition", "Sequences - pending transition", "Sequences - pending transition"}
};

bool findLatestSequence(const SequenceDefinition *&definition,
                        const SequenceRuntimeState *&runtime,
                        const SequenceStateDefinition *&state,
                        int &sequenceIndex)
{
    definition = nullptr;
    runtime = nullptr;
    state = nullptr;
    sequenceIndex = -1;

    for (int i = 0; i < gSequences.getCount(); i++)
    {
        const SequenceRuntimeState *candidateRuntime = gSequences.getStateAt(i);
        if (!candidateRuntime)
        {
            continue;
        }
        if (candidateRuntime->running || candidateRuntime->faulted || candidateRuntime->done)
        {
            sequenceIndex = i;
            definition = gSequences.getDefinitionAt(i);
            runtime = candidateRuntime;
            state = gSequences.getCurrentStateAt(i);
            return true;
        }
    }

    return false;
}

}  // namespace

int getSystemSourceCount()
{
    return static_cast<int>(sizeof(kSystemSources) / sizeof(kSystemSources[0]));
}

const SystemSourceDefinition *getSystemSourceDefinitionAt(int index)
{
    if (index < 0 || index >= getSystemSourceCount())
    {
        return nullptr;
    }

    return &kSystemSources[index];
}

bool isSystemSourceId(const String &sourceId)
{
    for (int i = 0; i < getSystemSourceCount(); i++)
    {
        if (sourceId == kSystemSources[i].id)
        {
            return true;
        }
    }

    return false;
}

String readSystemSourceValue(const String &sourceId)
{
    const BoardConfig *board = getActiveBoard();
    const SequenceDefinition *latestSequence = nullptr;
    const SequenceRuntimeState *latestSequenceState = nullptr;
    const SequenceStateDefinition *latestCurrentState = nullptr;
    int latestSequenceIndex = -1;
    findLatestSequence(latestSequence, latestSequenceState, latestCurrentState, latestSequenceIndex);

    if (sourceId == "system.ip")
    {
        return getIP();
    }
    if (sourceId == "system.wifi_mode")
    {
        return gConfig.wifi.mode;
    }
    if (sourceId == "system.active_board")
    {
        return gConfig.system.active_board;
    }
    if (sourceId == "system.board_template")
    {
        return board ? board->templateId : gConfig.system.active_board_template;
    }
    if (sourceId == "system.chip_template")
    {
        if (gConfig.system.active_chip_template.length() > 0)
        {
            return gConfig.system.active_chip_template;
        }

        if (board && !board->templateId.isEmpty())
        {
            for (int i = 0; i < gConfig.boardTemplateCount; i++)
            {
                if (gConfig.boardTemplates[i].id == board->templateId)
                {
                    return gConfig.boardTemplates[i].chipTemplateId;
                }
            }
        }

        return "";
    }
    if (sourceId == "system.alarm_active_count")
    {
        return String(gAlarms.getActiveCount());
    }
    if (sourceId == "system.alarm_pending_count")
    {
        return String(gAlarms.getPendingCount());
    }
    if (sourceId == "system.alarm_unacked_count")
    {
        return String(gAlarms.getUnackedCount());
    }
    if (sourceId == "system.alarm_latest")
    {
        const AlarmDefinition *definition = gAlarms.getLatestActiveDefinition();
        return definition ? definition->label : "";
    }
    if (sourceId == "system.alarm_latest_severity")
    {
        const AlarmDefinition *definition = gAlarms.getLatestActiveDefinition();
        return definition ? definition->severity : "";
    }
    if (sourceId == "system.alarm_latest_status")
    {
        const AlarmRuntimeState *alarmState = gAlarms.getLatestActiveState();
        return alarmState ? alarmState->statusText : "";
    }
    if (sourceId == "system.sequence_running_count")
    {
        return String(gSequences.getRunningCount());
    }
    if (sourceId == "system.sequence_fault_count")
    {
        return String(gSequences.getFaultCount());
    }
    if (sourceId == "system.sequence_done_count")
    {
        return String(gSequences.getDoneCount());
    }
    if (sourceId == "system.sequence_latest")
    {
        return latestSequence ? latestSequence->label : "";
    }
    if (sourceId == "system.sequence_latest_state")
    {
        return latestCurrentState ? latestCurrentState->label : "";
    }
    if (sourceId == "system.sequence_latest_status")
    {
        return latestSequenceState ? latestSequenceState->statusText : "";
    }
    if (sourceId == "system.sequence_latest_reason")
    {
        if (!latestSequenceState)
        {
            return "";
        }
        if (latestSequenceState->faultReason.length() > 0)
        {
            return latestSequenceState->faultReason;
        }
        if (latestSequenceState->waitingReason.length() > 0)
        {
            return latestSequenceState->waitingReason;
        }
        return latestSequenceState->detailText;
    }
    if (sourceId == "system.sequence_latest_transition")
    {
        if (latestSequenceIndex < 0)
        {
            return "";
        }
        const SequenceTransitionDefinition *pendingTransition = gSequences.getPendingTransitionAt(latestSequenceIndex);
        return pendingTransition ? (pendingTransition->label.length() > 0 ? pendingTransition->label : pendingTransition->id) : "";
    }

    return "";
}

void appendSystemSources(JsonArray target)
{
    for (int i = 0; i < getSystemSourceCount(); i++)
    {
        JsonObject item = target.add<JsonObject>();
        item["id"] = kSystemSources[i].id;
        item["label_ru"] = kSystemSources[i].labelRu;
        item["label_en"] = kSystemSources[i].labelEn;
    }
}
