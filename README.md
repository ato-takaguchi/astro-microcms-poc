# Astro + microCMS + GitHub Actions + EC2 POC

microCMS の記事を 1 件取得し、Astro で静的 HTML を生成して EC2 の `/var/www/html/poc/` に配置する最小サンプルです。

## 1. 前提

- Windows + PowerShell
- Node.js 20 系
- Git
- GitHub リポジトリ
- microCMS の API
- EC2 に SSH で接続可能

## 2. microCMS 側の想定

このサンプルは、`news` という API エンドポイントから以下のフィールドを持つ記事を 1 件取得する想定です。

- `title` : テキスト
- `body` : リッチエディタ または HTML を含む本文

`body` はそのまま HTML として埋め込まれます。

## 3. PowerShell でのローカルセットアップ

### 3-1. ZIP を展開して移動

```powershell
Expand-Archive .\astro-microcms-poc.zip -DestinationPath .
Set-Location .\astro-microcms-poc
```

### 3-2. 依存関係をインストール

```powershell
npm install
```

### 3-3. `.env` を作成

```powershell
Copy-Item .\.env.example .\.env
notepad .\.env
```

`.env` の例:

```env
MICROCMS_SERVICE_DOMAIN=your-service-domain
MICROCMS_API_KEY=your-api-key
MICROCMS_ENDPOINT=news
```

### 3-4. 開発サーバ起動

```powershell
npm run dev
```

ブラウザで `http://localhost:4321` を開いて確認します。

### 3-5. 静的ファイル生成

```powershell
npm run build
```

生成結果は `dist\index.html` です。

## 4. GitHub へ登録

```powershell
git init
git add .
git commit -m "Initial Astro microCMS POC"
git branch -M main
git remote add origin https://github.com/＜owner＞/＜repo＞.git
git push -u origin main
```

## 5. GitHub Secrets

GitHub の `Settings` -> `Secrets and variables` -> `Actions` で以下を登録します。

- `MICROCMS_SERVICE_DOMAIN`
- `MICROCMS_API_KEY`
- `MICROCMS_ENDPOINT`
- `EC2_HOST`
- `EC2_USER`
- `EC2_PORT`
- `EC2_SSH_PRIVATE_KEY`
- `EC2_DEPLOY_PATH`

例:

- `MICROCMS_ENDPOINT = news`
- `EC2_DEPLOY_PATH = /var/www/html/poc/`

## 6. EC2 側の準備

### 6-1. 配置先ディレクトリを作成

```bash
sudo mkdir -p /var/www/html/poc
sudo chown ec2-user:ec2-user /var/www/html/poc
```

`ec2-user` は利用ユーザーに合わせて読み替えてください。

### 6-2. Apache から見えるか確認

- DocumentRoot 配下ならそのまま公開
- 既存設定次第では Alias の追加が必要

公開 URL の例:

- `https://example.com/poc/`

## 7. GitHub Actions の実行

### 手動実行

GitHub の `Actions` タブから `Build and Deploy to EC2` を手動実行できます。

### microCMS から自動実行

microCMS で Webhook を設定し、GitHub の `repository_dispatch` を呼び出します。

送信先 URL:

```text
https://api.github.com/repos/<owner>/<repo>/dispatches
```

ヘッダー:

```text
Authorization: token <GitHub Personal Access Token>
Content-Type: application/json
Accept: application/vnd.github+json
```

ボディ:

```json
{
  "event_type": "microcms_update"
}
```

## 8. 動作イメージ

1. microCMS で記事を公開
2. Webhook が GitHub Actions を起動
3. Actions が microCMS から記事を取得
4. Astro で `dist/index.html` を生成
5. EC2 の `/var/www/html/poc/` に配置
6. `https://ドメイン/poc/` で確認

## 9. 補足

- このサンプルは最小構成です。
- 記事一覧・詳細ページ生成は未対応です。
- 本番ではリリースディレクトリを作って symlink 切替にした方が安全です。
- `body` をそのまま HTML 埋め込みしているため、運用ルールは事前に決めてください。
