# Browser Escape Lab / Round 3

公開先: https://h4m4chi-ttr.github.io/x-external-browser/round3/

この第3弾は**成功未確認**の調査用です。Xの外部ブラウザ起動メニューより手間を減らせるかが合格条件。

## ケース

- H1: httpbingoのHTTP 302 → 普通のHTTPS到達ページ（対照）
- H2: httpbingoのHTTP 302 → x-safari-httpsスキーム（本命）
- H3: H2と同じ302入口のURLをXの投稿に直接貼る（t.co経由の差を比較）
- Q1: 通常HTTPSを符号化したQR画像を同じiPhoneで長押し
- Q2: x-safari-httpsを符号化したQR画像を同じiPhoneで長押し
- B1: window.webkitとmessageHandlersの公開プロパティ名を読み取り専用で確認する

まずSafari本体で対照実験、次にX内ブラウザで同じケースを試す。到達＝別ブラウザ起動ではない。アプリ切替で確認し、どの操作に何タップ必要だったか手動記録。

## 注記

このサイトは静的なGitHub Pagesなので、302は第三者サービス[httpbingo](https://httpbingo.org/)の /redirect-to?url=… を使う。サービスへのアクセス時はIPやUser-Agent等が渡る。ページ表示だけでは通信せず、各リンクを押した場合に接続する。事業者が任意のスキームへのLocationを許すか・Xでその遷移が処理されるかは実機未検証。HTTP側とアプリ側の失敗を区別すること。

QRはPNGとして固定生成し、通常URLとSafari指定URLそれぞれについてQRデコーダで文字列一致を確認済み。QR画像はリンクに包んでいない。iOSの画像認識メニューがX内ブラウザにも現れるかは未確認。

B1はJavaScriptから公開されている連携オブジェクトの存在と公開名を読み取るのみで、postMessage等は一切行わない。見えない場合も、隔離ワールドなどに機能が存在しない証明ではない。

すべての目視結果は端末内のlocalStorageに最大100件。解析・外部送信なし。JSONを書き出す場合は端末情報・メモに注意。

ローカルチェック:
```sh
node --test tests/core.test.cjs tests/round2.test.cjs tests/round3.test.cjs
python3 -m http.server 8000
```
