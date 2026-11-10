# Redesign 3D — FC Construção & Reforma (2026-11-09)

## Objetivo
Deixar o site mais atual e diferente, com 3D de verdade, imagens melhores e transições novas, sem perder as fotos reais das obras.
Direção aprovada: **planta 3D que vira obra real**.

## O que entra
1. **Abertura**: casa em linhas de planta (WebGL puro, `assets/js/blueprint.js`) montada pela rolagem em 5 etapas
   (terreno, fundação, estrutura, alvenaria, acabamento); ao fim a câmera entra na planta e ela se dissolve no timelapse real.
   Fallback: sem WebGL, aparelho fraco, economia de dados ou "reduzir movimento" → só o timelapse, como antes.
2. **Transições**: obras abrem a partir do triângulo da marca; a foto clicada cresce até a galeria (View Transitions);
   anel com reflexo e profundidade.
3. **Imagens**: Serviços com fotos reais das obras; WebP com JPEG de reserva; capas reais nos tours.
4. **Estrutura**: página mais curta no celular (história em carrossel, serviços e pilares em 2 colunas);
   seção de depoimentos pronta e oculta até haver depoimentos reais.

## Fora desta rodada
Páginas por obra, domínio próprio, remoção do selo antigo das fotos (precisa das fotos originais).

## Entrega
Branch `redesign-3d`; produção (`main`) só muda com aprovação.
