# Browser Escape Lab — Round 4
入口: https://h4m4chi-ttr.github.io/x-external-browser/round4/

第3弾でXのWebView上のQR画像は長押し「開く」で外部ブラウザに到達したと報告された。Xタイムラインの投稿画像でも成立するかは未確認。

1. 第3弾とバイト単位で同じQ1（通常HTTPS）PNGを保存し、Xの投稿へ1枚だけ添付する。投稿自体はユーザーが手動で行う。
2. T1：タイムラインの画像を拡大せずQR部分を長押し。
3. T2：画像をタップしてX画像ビューアでQR部分を長押し。
4. T3：本ページをX WebViewで開き、通常のHTMLリンクを長押し。
5. T4a：WebView上のURL文字画像を長押し、T4b：同じ画像をXに投稿して長押し。
6. 操作回数と、開いたブラウザが独立したアプリかを手動で記録。標準Xメニューの手間と比較。

Q1はもとの /round3/qr-https.png と同じバイナリで、その画像が格納するURLも第3弾の landing.html。Q2も第3弾のSafari指定版と完全に同じ。
Live Textの短いテキスト画像は https://example.com/ を含むPNGで、画像をHTMLリンクで囲っていない。
外部送信・自動ポストなし。結果は端末内localStorageに最大100件保存、手動JSON出力。
環境: iOS・X・ユーザー操作条件で挙動が異なり、Safari起動の実機確認はまだ未実施。
