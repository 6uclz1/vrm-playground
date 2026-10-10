# VRM Playground

TypeScript + Three.js + @pixiv/three-vrm で作った、ブラウザ内完結のVRMビューア。Charakuruから書き出したVRMをそのまま開けます。

## 起動

Node.js 22以上とpnpm 10以上を使用します。

```sh
pnpm install
pnpm dev
```

表示されたURLを開き、VRMを選択またはビューへドロップしてください。モデルは初期表示に同梱していません。既存の avatar.vrm をファイル選択から開いてください。

## 操作

- VRM 0.x / 1.0、MToon、VRMの揺れ物をサポート
- 直立・Tポーズ・アイドル・その場歩行・手振り、再生速度・一時停止
- 「調整」の腕の角度でT字（0°）から気をつけ（90°）まで変更。初期値は65°。歩行・アイドルにも反映され、手振り中は下げている腕に反映
- ドラッグで回転、右ドラッグでパン、ホイールやピンチでズーム
- 正面・横・背面・顔・全身へのカメラ切り替えと自動回転
- モデルの向きとX/Z位置を調整。ビューにフォーカスして矢印キーでも移動
- モデルに登録された表情、照明、背景色、グリッド、PNG保存

モーションは正規化ヒューマノイドボーンを使った手続き的アニメーションです。歩行はその場で再生します。表情がないモデルでは表情選択が無効になります。

## プライバシー

モデルの読み込みはFile APIとGLTFLoader.parseAsyncでブラウザのメモリ内だけで実行します。サーバーへのモデル送信、永続保存、解析ツール、外部CDN、外部フォントはありません。ライブラリはサイトにバンドルされます。モデルが外部URLや相対URLを参照する場合は遮断し、埋め込みテクスチャだけを受け入れます。サイト自身の静的ファイル取得は必要です。モデル切り替え時には古いGPUリソースを破棄します。

## GitHub Pages

```sh
pnpm build
```

`dist/` が公開対象です。Viteの相対baseでリポジトリ配下のURLに対応しています。

1. リポジトリをGitHubにpushします。
2. Settings → Pages → Build and deployment の Source を **GitHub Actions** に設定します。
3. `main`へのpushまたはActionsのDeploy GitHub Pagesを手動実行すると公開します。

VRMファイルはgitignore対象です。ユーザーのモデルを公開リポジトリへ追加する必要はありません。

## 検証

```sh
pnpm exec playwright install chromium
pnpm dev
# 別ターミナル
pnpm exec playwright test
VRM_TEST_FILE=/absolute/path/to/avatar.vrm pnpm exec playwright test
```

空状態・モバイル幅・背景操作、VRM実ファイルの読み込み・モーション・視点・再読み込み・PNG保存・外部通信なしを確認します。実モデルのテストは環境変数を指定しない場合スキップします。既存のChromiumを使う場合は`PLAYWRIGHT_EXECUTABLE_PATH`を指定できます。

## 参考

- [Charakuru](https://github.com/nanocle/Charakuru)
- [three-vrm](https://github.com/pixiv/three-vrm)

モデルの利用条件はそれぞれの作者・VRMメタデータに従ってください。
