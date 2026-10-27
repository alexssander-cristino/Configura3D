# Preparação de Modelos 3D para o Configurador

O configurador modifica o modelo **de verdade**: trocar o tecido de um sofá
deve alterar o material da malha correspondente, não aplicar uma cor no objeto
inteiro. Por isso o modelo deve ter **malhas separadas e nomeadas**.

## Requisitos do modelo

- Formato: **GLB** (recomendado) ou glTF.
- Malhas (meshes) com **nomes únicos e descritivos** (ex: `base`, `gaveta`,
  `prateleira`, `estofado`, `pés`).
- Cada malha que será configurável deve ter seu próprio **slot de material**
  (PBR) para permitir troca de cor/acabamento.
- Pivô (origem) posicionado de forma intuitiva (ex: centro da base).
- Escala em metros, unidades consistentes.
- Otimizado: pouquíssimos polígonos, texturas comprimidas, mipmaps.

## Mapeamento explícito

Não suponha que um modelo genérico tenha componentes separados. No admin, mapeie
cada malha do GLB para um **componente configurável**:

| Componente | Nome da mesh no GLB | Tipo | Configurável |
|------------|---------------------|------|--------------|
| Base       | `base`              | cor  | sim          |
| Gaveta     | `gaveta`            | material | sim      |
| Prateleira | `prateleira`        | acabamento | sim   |

O admin armazena esse mapeamento em `model_components` (tabela `meshName`).

## Exemplo de demonstração

O repositório inclui um modelo de demonstração gerado em
`apps/web/public/models/demo-organizador.glb` com três malhas nomeadas:

- `base` (material `base-material`)
- `gaveta` (material `gaveta-material`)
- `prateleira` (material `prateleira-material`)

**Este é um modelo de demonstração, identificado como tal. Não é um modelo
comercial real.** Use-o apenas para validar o fluxo do configurador.

## Gerar o modelo de demonstração

```bash
node scripts/generate-demo-model.mjs
```

O script escreve um GLB 2.0 válido (malhas caixas, materiais PBR nomeados) em
`apps/web/public/models/demo-organizador.glb`.

## Checklist antes de publicar

- [ ] Modelo em .glb, <= 50 MB
- [ ] Malhas configuráveis nomeadas
- [ ] Cada malha com material PBR separado
- [ ] Miniatura gerada (ou gerada automaticamente)
- [ ] Mapeamento mesh → componente cadastrado no admin
- [ ] Teste de troca de material no configurador
