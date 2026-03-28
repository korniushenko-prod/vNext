# Selector Block V1

## RU

`Selector` выбирает один из двух входных сигналов и публикует один выходной сигнал.

### Назначение

- выбирать между локальным и удалённым источником
- делать сервисную подмену
- переключаться на резервный датчик

### Поля

- `type: "selector"`
- `primary` — основной входной сигнал
- `secondary` — резервный или подменный входной сигнал
- `select` — бинарный сигнал выбора
- `output` — имя выходного сигнала

### Логика

- `select = false` -> на выход идёт `primary`
- `select = true` -> на выход идёт `secondary`

### Пример

```json
"blocks": {
  "tank_level_selector": {
    "type": "selector",
    "primary": "tank_level_local",
    "secondary": "tank_level_remote",
    "select": "tank_level_use_remote",
    "output": "tank_level_selected"
  }
}
```

## EN

`Selector` chooses one of two input signals and publishes one output signal.

### Purpose

- switch between local and remote sources
- support service override
- fall back to a backup sensor

### Fields

- `type: "selector"`
- `primary` — default input signal
- `secondary` — backup or override input signal
- `select` — binary selector signal
- `output` — output signal id

### Logic

- `select = false` -> publish `primary`
- `select = true` -> publish `secondary`
