# Au Vita Pet Shop — Website

Projeto de desenvolvimento web para apresentar a estrutura, os serviços e o catálogo de um pet shop. Esta é uma versão de portfólio, separada do ambiente comercial.

## Tecnologias

- HTML5, CSS3 e JavaScript
- Supabase (integração prevista no código original, desativada nesta versão)

## Funcionalidades

- Layout responsivo para celular e computador.
- Apresentação dos serviços e catálogo demonstrativo de produtos.
- Links de contato e localização da empresa.
- Código do painel administrativo para gerenciamento de produtos e conteúdo; o login e as operações de banco estão desativados nesta versão.

## Como executar

Pré-requisitos: Git, Python 3 e navegador moderno. Não é necessário instalar dependências JavaScript.

```bash
git clone https://github.com/brenoschmidt001/auvita-petshop-website.git
cd auvita-petshop-website
python -m http.server 8000
```

Abra http://localhost:8000 no navegador. O painel pode ser visualizado em http://localhost:8000/admin.html, mas não permite login sem um ambiente Supabase próprio. Algumas imagens, fontes e mapas dependem de internet.

## Demonstração

Página inicial do site desenvolvido para a Au Vita Pet Shop.

<img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/a3d52494-5d6d-49bb-a584-d2fe944973f5" />


## Segurança e licença

O arquivo de configuração contém valores vazios e a integração está desativada. Não foram incluídos scripts de implantação ou migração do banco comercial. Não utilize credenciais privadas no frontend.

A identidade visual e as imagens da empresa são utilizadas com autorização para apresentação no portfólio. A autorização de publicação não implica autorização para sublicenciar o projeto ou imagens de terceiros. A licença de redistribuição deve ser confirmada com os titulares antes de aplicar uma licença aberta.
