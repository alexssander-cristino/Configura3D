# Upload e Gerenciamento de Modelos 3D

O Configura3D aceita modelos 3D nos formatos **GLB** e **glTF** (binário).
Priorize **GLB** (arquivo único, embaralha texturas e buffers).

## Fluxo administrativo

1. No painel admin (`/admin`), cadastre o modelo em **Modelos 3D**.
2. Informe: nome, descrição, arquivo (.glb/.gltf), miniatura (opcional) e
   metadados (dimensões, escala).
3. O sistema registra o asset com status `pending`.
4. Um processo de fundo (tarefa em segundo plano) valida o formato, gera a
   miniatura e atualiza o status para `ready` ou `failed`.
5. Associar o modelo a um produto em **Produtos > Editar**.

## Validações (backend)

- Extensão permitida: `.glb`, `.gltf`
- MIME types: `model/gltf-binary`, `model/gltf+json`, `application/octet-stream`
- Tamanho máximo: 50 MB
- O conteúdo é inspecionado; arquivos inválidos geram status `failed` com
  mensagem de erro.

## URLs de acesso

- Em desenvolvimento sem MinIO: o arquivo é servido localmente
  (`/models/demo-organizador.glb`).
- Com MinIO/S3: upload via URL assinada (`POST /api/v1/upload/url`) e o asset
  é registrado (`POST /api/v1/upload/complete`).

## Processamento pesado

Não é feito diretamente na requisição web. Quando houver fila (Redis) e worker,
o processamento (validação, miniatura, compressão) ocorre em segundo plano.
