# Browser Escape Lab — Round 5

公開URL: https://h4m4chi-ttr.github.io/x-external-browser/round5/

## 目的

X内ブラウザの長押し→「Safariで開く」は実機で成功したが、通常のタップでは未成功。今回は、HTTP 302、`window.open()`の`noopener`条件、WKWebViewの自動URL認識を、対照ケースを置いて切り分ける。**実機での成功を保証しない。**

## 試験

1. H0: 直リンク `x-safari-https://example.com/`。
2. H1: httpbingo.org `/redirect-to?url=https://example.com/` からHTTP 302（対照）。
3. H2: httpbingo.org `/redirect-to?url=x-safari-https://example.com/` からHTTP 302。
4. H3: H2と同じHTTPS URLをXのポストに貼って、投稿のリンクから直接開く。H2とは別の経路。Xへは手動投稿する。
5. O1/O2: 同じGitHub Pagesの到達ページへ`window.open(url,'_blank','noopener')` と `window.open(url,'_blank')` を比較。
6. O3/O4: 同じサイトのSafariスキーム版を同様に比較。同期タップ処理中で呼び出す。
7. O5/O6: 通常のHTTPSのまま送信先だけ別ドメイン `example.com` に変更し、noopenerあり／なしを比較。O1/O2との差分は送信先ドメインだけ。アプリ側のドメイン別ポリシーを切り分ける。
8. D1: 通常の`<a>`でexample.comへ。D2〜D4: HTMLリンクタグを使わずプレーンテキストURLを表示。文字列が自動的にリンク化されたか、その後通常タップでどこへ行くかを別々に記録。

## 留保

- 第3弾で失敗した302はHTTPサービスの転送先ホスト制限による403。H1〜H3はそのサービスが許可先として列挙したexample.comを使うが、現在の302レスポンスヘッダー自体はこちらの環境で実測できていない。403やサービスエラーはX側の拒否ではない。
- サードパーティのhttpbingoへのアクセス時はIPアドレス・User-Agent等が送信される。実験一覧を開いた時点ではhttpbingoへアクセスしない。
- Apple公式によれば`WKWebViewConfiguration.dataDetectorTypes`の初期値は`none`。OS自動認識はXが有効にしていないと作動しない。
- `noopener`なしのテスト先は当サイトおよび固定の `example.com` に限定（オープナー操作の危険がある任意URLでは使用しない）。戻り値が`null`でもブラウザが開いた／開かなかったと判定しない。
- H0・H1・H2をSafari本体とX内で比較。H3はXのポストからのみ。実際にSafariが独立アプリで開いたかはアプリ切替で確認する。
- データはブラウザ内のlocalStorageに最大100件のみ保存。自動送信はなく、JSONに入力した端末情報やメモが入るので共有前に確認する。

## ローカル検証

```sh
node --test tests/core.test.cjs tests/round2.test.cjs tests/round3.test.cjs tests/round4.test.cjs tests/round5.test.cjs
node --check round5/app.js
python3 -m http.server 8000
```

参照:
- https://developer.apple.com/documentation/webkit/wkwebviewconfiguration/datadetectortypes
- https://developers.google.com/admob/ios/browser/webview/click-behavior
- https://github.com/shalanah/inapp-debugger
