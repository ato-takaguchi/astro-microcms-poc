# astro-microcms-poc

microCMS の `case-gallery` エンドポイントから、
`/cases/elevator/gallery/{id}.html` を Astro で静的出力する POC です。

## 前提

microCMS の API は次の最小構成を想定しています。

- `title` : テキストフィールド
- `body` : リッチエディタ

## body に入れる想定範囲

`body` には、ページ固有部分だけを入れてください。

今回の NOREN HTML をベースにすると、次の範囲をそのまま入れる想定です。

- 開始: `<div class="u-bg-black02 u-pb-1">`
- 終了: `</div><!-- /.u-bg-black02 -->`

つまり、以下は Astro 側の固定テンプレートで持っています。

- head
- ヘッダー
- パンくず
- ページタイトル
- 資料ダウンロード / お問い合わせ
- お役立ち情報
- ページトップ
- フッター

## 環境変数

`.env` などで以下を設定してください。

```env
MICROCMS_SERVICE_DOMAIN=your-service-domain
MICROCMS_API_KEY=your-api-key
MICROCMS_ENDPOINT=case-gallery
```

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

Astro は `build.format = 'file'` にしているため、出力は `id.html` 形式になります。
