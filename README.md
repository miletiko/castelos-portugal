# Castelos de Portugal

Mapa interativo com todos os castelos de Portugal continental, informação histórica (recolhida da Wikipédia/Wikidata), e um roteiro pessoal de visitas.

## Funcionalidades

- Mapa de Portugal (Leaflet) com um marcador por castelo, agrupados em clusters.
- Ao passar o rato sobre um castelo: nome, localização e ano de construção.
- Clicar abre a página de detalhe com descrição, distrito, ano, coordenadas e link para a Wikipédia.
- Marcar castelos como "visitado" e importar fotos — guardado localmente no browser (localStorage + IndexedDB), sem necessidade de backend.
- Pesquisa e filtro por distrito / só visitados.

## Como correr localmente

É um site estático — basta servir a pasta com qualquer servidor HTTP simples:

```bash
python -m http.server 8091
```

Depois abre `http://localhost:8091`.

## Dados

Os dados dos castelos estão em [`data/castles.json`](data/castles.json) — um array com nome, coordenadas, distrito, ano de construção (quando conhecido), imagem e descrição. Podes editar este ficheiro diretamente para corrigir ou adicionar informação a qualquer castelo.
