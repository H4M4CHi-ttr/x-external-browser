# 第2弾：別経路の外部ブラウザ起動実験

[実験ページ](https://h4m4chi-ttr.github.io/x-external-browser/round2/)

第1弾の15方式とは別の、4系統・10ケースです。**Xで成功することを確認した手法ではありません。** アプリからの脱出を保証せず、同じ端末のSafari本体とX内ブラウザを比較するためのページです。

## ケース

| ID | 内容 | 条件 |
| --- | --- | --- |
| N1 / N2 | 素のHTTPSリンク：同一サイト／example.com | `minimal.html`。JavaScript、クリック記録、別タブ指定なし |
| N3 / N4 | 素のSafariスキーム：同一サイト／example.com | N1 / N2と同じHTMLでスキームだけ比較 |
| M1 / M2 | meta refresh：HTTPS／Safariスキーム | 専用HTMLを開くと1秒後に1回転送を要求。JavaScriptなし |
| R1 / R2 | Instagram／Threadsの `extbrowser` 中継 | 対応アプリのインストールが必要。非公開スキームで、Xからの呼び出しは未検証 |
| S1 / S2 | Web Share API：実験室／example.com | 共有先はOS・ブラウザ・導入アプリ依存。Safariの指定ではない |

`meta-https.html` と `meta-safari.html` のURLをXに直接貼り付けると、「一覧ページで再タップ」と「Xに貼った入口から直接」の比較もできます。専用ページの再読み込みは再試行になります。通常の `index.html` と `minimal.html` は自動転送しません。

外部の遷移先は `https://example.com/` に固定しています。任意URLを受け付ける中継サービスではありません。HTTP 302を返すサーバーやUniversal Links対応アプリは追加していません。

## 試行・記録

まずSafari本体で各ケースを試し、次にXから同じケースを試します。新しいタブ、確認ダイアログ、中継アプリ、共有UIが表示されたことは、外部ブラウザの別アプリが開いたことと区別してください。実験のリンクにはクリック計測を付けず、戻ってからケースと目視結果を選ぶ手動記録にしています。

結果は `x-external-browser.round2.v1` という専用localStorageキーに最大100件保存します。各保存時の端末・OS・Xバージョン・試行元・経路を記録し、JSONでコピーできます。第1弾の `x-external-browser.lab.v1` は読み書きしません。複数タブで同時に記録せず、ブラウザを変えた場合は元の検証画面へ戻って記録してください。

保存が拒否される環境では、この画面のメモリ上だけで続行して警告します。移動する前にJSONをコピーしてください。JSONは端末情報や手動メモを含みます。結果の自動送信、解析タグ、外部ライブラリはありませんが、Pages・リンク先・呼び出すアプリへの通常のアクセスは発生します。

Web Share APIはタップ中に同期呼び出しし、その前に待機処理を挟みません。APIの存在、要求の受付、Promiseの完了、外部ブラウザの起動を別々に扱います。Promiseがresolveされても結果を成功に変更しません。AbortErrorはキャンセルまたは共有先がない場合として表示します。共有シートの先で宛先を選ぶ操作は利用者の判断です。

## 検証

```sh
# 静的構造・遷移先・スクリプト非使用など6チェック
node --test tests/round2.test.cjs
node --check round2/app.js

# オフライン描画・操作12チェック。Python PlaywrightとChromiumが必要
# Chromiumの場所はCHROMIUM_PATHで指定可能
python3 tests/round2_browser.py
```

ブラウザテストはHTML/CSS/JavaScriptをメモリ上で描画します。**ストレージ、secure-contextフラグ、共有APIはテスト用の代替実装です。** 通信・実際のURL遷移・OS共有シート・ストレージの実永続化は検証しません。検証環境ではページ遷移が `ERR_BLOCKED_BY_ADMINISTRATOR` で拒否されるため、ブラウザの制限を変更せずこの方法を使っています。meta refreshは静的記述の検査のみです。

API非対応、resolve、AbortError、NotAllowedError、canShare=false、二重要求防止、手動記録と状態復元、JSON出力、保存失敗・破損、コピー失敗、320/390/1365px幅を確認します。実機のX・iOS・Androidで外部ブラウザが起動するかは、別途このページから試してください。第1弾の既存スクリプト・テストは変更しません。

## 根拠と限界

- [W3C Web Share API](https://www.w3.org/TR/web-share/)：共有先を利用者が選ぶAPI。外部ブラウザ起動の保証ではありません。
- [WHATWG meta refresh](https://html.spec.whatwg.org/multipage/semantics.html#attr-meta-http-equiv-refresh)：HTMLによる転送指定。非HTTPスキームがXで許可される根拠ではありません。
- [inapp-escapeの公開実装](https://github.com/marco1cc/inapp-escape/blob/master/src/index.js)：Instagram／Threads向けの非公開スキームを参照。Xからこれらのアプリを中継できる実証ではありません。
