# Bancada

Motores de carro e moto numa bancada 3D, com física de trem de força e som sintetizado em tempo real (AudioWorklet).

```bash
npm install
npm run dev
```

Controles: `↑` acelera · `↓` freia · `Shift` / `Ctrl` sobe / reduz marcha · `Enter` ignição · `X` raio-X · `E` troca o escape. No celular aparecem botões de toque.

## Estrutura

```
src/lib/
  engines/
    Engine.ts         classe base: curva de torque, atrito, relações, dinamômetro, config de áudio
    CarEngine.ts      câmbio + diferencial
    BikeEngine.ts     primária + corrente
    layouts.ts        disposição dos cilindros (V8, em linha, V4 Ducati)
    catalog/          um arquivo por motor
    index.ts          lista de motores do menu
  exhaust/            kits de escape (Original, Slip-on, Full)
  sim/Bench.ts        física: motor → embreagem automática → câmbio → roda → veículo
  audio/EngineAudio.ts  AudioContext + worklet
  render/             cena three.js e modelo procedural do motor
  instruments/        conta-giros e dinamômetro em canvas
  BenchApp.ts         loop principal que liga tudo
public/worklets/engine-processor.js   síntese do som (roda na thread de áudio)
```

## Adicionando um motor

1. Crie `src/lib/engines/catalog/meuMotor.ts` exportando um `new CarEngine({...}, drive)` ou `new BikeEngine({...}, drive)`. Os outros arquivos do catálogo servem de modelo; os tipos em `engines/types.ts` documentam cada campo.
2. Adicione-o ao array `ENGINES` em `src/lib/engines/index.ts`.

O modelo 3D, o som, o dinamômetro e o conta-giros saem todos dos dados do motor. Para outro tipo de transmissão, estenda `Engine` e calcule o `Drivetrain` no construtor.
