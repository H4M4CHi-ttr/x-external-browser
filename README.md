# X External Browser Lab

Xのアプリ内ブラウザからSafariなどへ移れるかを、実機で比較する静的な実験ページです。**外部ブラウザで開けると保証するツールではありません。** レイアウト崩れを避ける導線を探すため、方式・環境・目視結果を分けて記録します。

## GitHub Pagesで公開

[リポジトリのPages設定](https://github.com/H4M4CHi-ttr/x-external-browser/settings/pages)で、次を選びます。

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)** → **Save**

HTML/CSS/JavaScriptをそのまま配信します。ビルド、npm install、APIキーは不要です。`.nojekyll`を置いています。設定保存だけでなく、GitHubのデプロイ完了と実際のページ表示も確認してください。

有効化後のURL:

- 通常の実験室: https://h4m4chi-ttr.github.io/x-external-browser/
- 読込後にSafari起動を1回だけ試す: https://h4m4chi-ttr.github.io/x-external-browser/?auto=safari
- 読込後にAndroid Intentを1回だけ試す: https://h4m4chi-ttr.github.io/x-external-browser/?auto=intent

最後の2つはページ内の再タップなしで起動を試す、**自動起動の実験用URL**です。通常URLでは自動転送しません。自動試行は1秒後に1回だけで、中止ボタンがあります。再読込によるループを避けるため、実行前にautoパラメーターを除去します。別の試行を開始したときやページを離れたときも予約を中止します。

## 試し方

1. まずSafariまたはChromeで開き、端末・OS・Xのバージョン・既定ブラウザ・試行元を入力します。ブラウザ側での対照実験になります。
2. 通常の実験URLをXの投稿などから**Xアプリで開き**、同じ条件を入力します。このリポジトリは投稿を代行しません。
3. 方式を1つずつ試し、実際にSafari/Chromeの**別アプリ**へ移ったか、OSのアプリ切替画面も使って目視確認します。単に到達画面が出たことや、別タブができたこととは区別してください。
4. 元の検証画面へ戻り「結果を記録」で保存します。最後に「JSONを書き出す」でコピーまたはダウンロードします。結果を追加したら再度書き出してください。

データはブラウザごとに別です。X側からSafariへ移っても保存領域は自動で共有されません。記録は元の検証画面で行い、複数タブで同時に記録しないでください。XやOSを更新した場合は新しい試行として記録します。

## 比較する15方式

| 番号 | 方式 |
| --- | --- |
| 01–03 | 通常HTTPS、target="_blank"、同期window.open |
| 04–08 | x-safari-httpsの通常リンク、別タブ、同期location.assign、同期window.open、1.5秒遅延 |
| 09 | iOS Chromeのgooglechromesスキーム |
| 10–12 | Android Intentのアプリ指定なし、Chrome指定、HTTPS fallback付き |
| 13 | openExternalBrowser=1（LINE用パラメーターの比較。X対応は未確認） |
| 14–15 | 専用HTTPS URLの読込後にSafari / Android Intentを試行 |

スキームのリンク先はこの実験室自身に固定しています。任意の外部URLへ転送する機能や、ユーザー指定のJavaScriptを実行する機能はありません。カスタムスキーム試験はHTTPS配信でのみ有効です。

## 記録と判定の限界

- 結果は手動申告です。User-Agent、blur、visibilitychange、window.openの戻り値から「成功」と自動判定しません。
- Androidのfallback先には別の表示を出します。fallbackへの到達は外部ブラウザ起動の証明ではありません。
- ページ内の「結果を記録」だけを押した場合、既存試行がなければ「起動履歴なしの手動入力」として明示します。
- 端末情報、viewport / VisualViewport、CSSのdvh / svh対応、実行時のuserActivationを記録します。1.5秒の遅延でユーザー操作の権限が必ず失われるとは仮定しません。
- 30vh / 30dvhとキーボード表示時の比較欄は補助診断です。すべてのレイアウト不具合を再現するものではありません。
- GitHub Pagesのみでは任意のHTTP 302応答やネイティブアプリ側のUniversal Links設定は検証しません。

## プライバシー

実験結果はこのページのlocalStorageに最大100試行、各試行のイベントは最大50件保存します。保存が拒否された場合はメモリ上で続行し、警告を表示します。その場合はページを閉じる前にJSONを保存してください。

解析タグ、外部ライブラリ、外部フォント、結果の自動送信はありません。配信元GitHubには通常のページアクセスが届きます。JSONには端末情報と入力したメモが含まれるため、共有前に内容を確認してください。「結果を消去」はこの実験室の試行だけを消し、環境の入力や他ページの保存データは消しません。

## 開発と検証

ランタイム依存なし。`index.html`、`styles.css`、`core.js`、`app.js`を同じディレクトリに置きます。

```sh
# URL生成・状態復元など14項目。Node.js 22で確認。
node --test tests/core.test.cjs
node --check app.js

# ローカルでUIを見る（HTTPではカスタムスキーム試験を無効化）
python3 -m http.server 8000
```

任意のオフラインUIテストは`tests/browser_smoke.py`です。Python PlaywrightとChromiumがある検証環境で実行します。Chromiumのパスは`CHROMIUM_PATH`で変更できます。

```sh
python3 tests/browser_smoke.py
```

このテストはネットワークにアクセスせず、DOMを描画し、明示的な遷移・ストレージ代替実装で呼出しを観測します。15ケースのUI、手動結果、JSON、入力文字の安全な表示、予約の取消し、自動起動の単発実行、保存失敗、幅320/390/1365pxを確認します。**HTTP配信、本物のストレージ永続化、Xアプリ、iOS/Android、外部アプリ起動の実機試験ではありません。** 初版作成時点でこれらの実機結果は未記録です。

## 参考

- [Chrome公式: Android Intents](https://developer.chrome.com/docs/android/intents)
- [LINE公式: URLスキーム](https://developers.line.biz/ja/docs/line-login/using-line-url-scheme/)
- [Inapp Debugger: 開発者による環境別の試験結果](https://github.com/shalanah/inapp-debugger) — 本実験の結果ではありません。
- [GitHub公式: Pagesの公開元設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
