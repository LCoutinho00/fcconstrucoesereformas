# FC Construção & Reforma

Site institucional da FC Construção & Reforma (Brasília-DF, desde 1992).

Site estático: `index.html` + `assets/` (CSS, JS, imagens e vídeos). Sem build.

- Abertura: `assets/js/blueprint.js` (WebGL puro) — planta 3D da casa desenhada no scroll, que se dissolve no timelapse da obra (`build-scrub.js`). Sem WebGL, em aparelho fraco ou com "reduzir movimento", fica só o timelapse.
- Imagens: cada JPEG tem um `.webp` ao lado; o site usa WebP e cai para JPEG em navegador antigo. Ao trocar uma foto, gere os dois.
- Depoimentos: a seção `.voices` no `index.html` está oculta (`hidden`) até haver depoimentos reais.
- Hero: `assets/js/photo-motion.js` (WebGL) — sequência de fotos reais das obras (SHIS QI 15, SHIS QL 6, Unique) com parallax de profundidade, água, nuvens, folhas e transição com borda de luz.
- Animações e interações: `assets/js/main.js` (GSAP + ScrollTrigger + Lenis).
- Estilos: `assets/css/style.css`.

Deploy: Vercel (projeto estático, sem framework).

Cache: CSS/JS são referenciados com `?v=AAAAMMDDhhmm` no `index.html`. Ao alterar esses arquivos, atualize o número
para que os navegadores baixem a versão nova (o `vercel.json` revalida HTML/CSS/JS e guarda imagens por 1 dia).
Timelapse: os quadros ficam em `assets/timelapse/{lg,sm}/fNNN.jpg`. Ao trocá-los, atualize `data-frames` e
`data-version` na seção `#build` do `index.html` — os nomes dos arquivos se repetem e, sem a versão, navegadores
misturariam quadros novos com antigos do cache.
