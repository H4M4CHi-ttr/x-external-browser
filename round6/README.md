# 第6弾 — 長押しリンクプレビュー → ブラウザゲーム

公開入口: https://h4m4chi-ttr.github.io/x-external-browser/round6/
直接ゲーム: https://h4m4chi-ttr.github.io/x-external-browser/round6/play.html

## 狙い

Xのアプリ内ブラウザで通常リンク長押し→「Safariで開く」が実機で有効だったことから、リンクプレビューを**タップした場合も**Safariへ渡されるか検証する。

- `index.html`: XのUser-Agent（例: `Twitter for iPhone/12.45.1`）を見て長押し案内へ切り替える。判定はUAによる推定にすぎず、Xの内部ブラウザかどうかを完全には確定できない。
- `play.html`: プレビュー内で最初からゲーム画面が見えるように設計した本物のミニゲーム（STAR CATCHER）。最初の★タップで25秒のカウント開始、10個でクリア。CSSとJSはサイト内配信、外部アセット・通信なし。
- CTAは**単なるHTMLのa要素**。JSでタップを置き換えたり、長押しメニューを強制表示したりしない。Webサイト側にはiOSのプレビュー表示やSafari起動を強制する権限がない。
- iPhone版Xでは長押しプレビュー、Android版Xでは **Chromeの外部起動を試すIntentリンク**を別々に表示。Android向けにQRや長押しを指示しない。
- Android Intentは `intent://h4m4chi-ttr.github.io/x-external-browser/round6/play.html#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=...;end` を使用。**Chromeアプリが必要で、Xが外部Intentを許すかは未確認**。無反応ならX内の「⋮ → ブラウザで開く」の手順、またはゲームURLをコピーする手段を案内。
- Android版Xには「外部リンクを開く → 外部ブラウザ」の設定があるとの2026年11月の報告があるが、2026年7月には同設定が反映されない不具合報告もあり、一般ユーザーに設定を必須としない。
- `?demo=x` / `?demo=android` は表示だけの擬似モードで、実際のXアプリと同じプレビューやIntent動作は再現しない。`?demo=normal` で通常画面を強制できる。

## 実機で試すこと

1. 第6弾の入口をXアプリの内蔵ブラウザで開く（XのUser-Agent検出と大きな「長押しでゲームプレイ」カードを確認）。
2. 大きなカードを**長押し**。プレビューが出て、その内容がすぐゲーム画面になっているか確認する。
3. **プレビュー部分をタップ**して、Safariが独立したアプリとして起動するか確認する。
4. 同じカードをもう一度長押しし、メニューの「Safariで開く」をタップする対照実験も実施。通常タップではX内に残る場合、経路を分けて記録。
5. **Androidは別ルート:** X内で表示される「Chromeでゲームを開く（実験）」を普通にタップ。開けないならXの「⋮ → ブラウザで開く」を試す。UAにXが出ないChrome Custom Tabs環境では `?demo=android` に切り替え可能。
6. iPhone側で長押しプレビューが出ない場合はXやOSの挙動に依存するので、サイト側で強制できない。
7. SafariまたはChromeからゲーム本体を開き、星が集められるか確認する。

## 設計上の注意

- iPhoneのプレビュータップがSafariへ移るか、AndroidのIntentがChromeを独立したアプリとして起動するかは**どちらも未検証**。リンクプレビューはWKWebViewの`allowsLinkPreview`やアプリ側のコンテキストメニュー実装に左右される。Chrome Custom Tabsの「Chromeで実行中」という表示だけでは外部移動成功ではない。
- AndroidではXのUIや端末設定、Intent許可によって処理が変わる。User-AgentにXの情報がなく、通常ブラウザと区別できない場合もある。正常に検出されない人にはAndroid表示への切替リンクを提供する。
- ゲームに再生ボタンや全画面遷移を置かず、初期レンダリングですぐゲームが見えるようにしている。プレビュー中にカウントダウンが進まないよう、タイマー開始は実際の★タップ後のみ。
- 検証データは端末の`localStorage`に最大30件。勝手な送信、ポスト、広告、外部サービスへの通信はない。
- 外部ブラウザに切り替わる際、保存領域が変わり記録が共有されないことがある。結果は入口のX内ブラウザ側に戻って保存する。

## 確認

```sh
node --test tests/round6.test.cjs
node --check round6/gate.js
node --check round6/play.js
python3 -m http.server 8000
```

Apple/WebKitの背景:
- https://webkit.org/blog/7016/ios-10-link-preview-api-in-wkwebview/
- https://developer.apple.com/documentation/webkit/wkwebview

Google ChromeのIntent公式仕様: https://developer.chrome.com/docs/android/intents
2026年のX Android設定報告: https://engrmemo.jp/nw/twitter-inner-browser/
2026年7月の設定動作不具合報告: https://sbapp.net/appnews/sns/twi/syogai/external-browser-bug-185879

## 2026-11-21: iPhone版Xの長押しメニューが出ない報告と比較試験

iPhone版Xで、ページ上部の簡単な「トップに戻る」リンクは長押しメニューが出る一方、元の装飾カードではメニューが出ないという実機報告を受けた。**原因は未確定**。リンク要素自体には正常な`href`があり、JavaScriptによる`contextmenu`イベントの中止処理はない。

以下を同じゲーム画面に対して比較できるようにした：

1. 大きな単一テキストリンク（装飾を減らし、子要素なし、元のカードと同じ絶対URL）。今回の第一候補。
2. 普通のテキストリンク・絶対URL（第一候補と同じhref）。
3. 普通のテキストリンク・相対URL（ブラウザが解決すれば同じURL）。
4. 旧版の装飾カード（詳細の中に保存）。
5. トップに戻るリンク（既に動作報告あり）。

**どれでプレビューが出るか**、プレビューをタップした場合と「Safariで開く」メニューを選んだ場合の行き先を分けて記録する。プレビューのタップでSafariが起動する保証はない。iPhone版Xのコンテキストメニュー表示はWebKitやアプリ側の処理に依存する。

- 1だけ成功するなら、旧カードにあった入れ子レイアウトやCSSが原因候補になる。
- 2成功／3失敗なら、絶対URLと相対URLの処理を疑う（逆の組み合わせも同様）。
- 1と2が成功、4が失敗なら、複雑なカード構造・装飾に関係する可能性が高まる。
- 1〜4すべて失敗、5だけ成功なら、リンク先・経路・アプリ側のドメイン処理などをさらに調べる必要がある。

現時点で実機のX内蔵ブラウザの再現・検証はできない。検証ページが出ただけで「バグ修正済み」と判定しない。

## 2026-11-21: Android Intentの実機エラー報告

Androidで公開した`intent://`リンクの操作時に「⚠️このアクションを実行できるアプリはありません」というエラーが報告された。これは**そのX・Android環境で今回のURIを処理できなかった**ことを示すが、Chrome未導入や全Androidでの失敗を証明しない。Googleの`S.browser_fallback_url`はChromeがIntentリンクを処理する場合の仕組みで、Xが常に扱う保証はない。

Androidのメイン導線は、実機で起動に失敗したIntentではなく、「X内ブラウザの⋮ → ブラウザで開く」を先頭に変更した。URLコピーを第2候補、Intentリンクは詳細欄に格下げし、成功未確認・エラー報告ありと明記する。AndroidでQRや長押しを案内しない。

参考：Chrome公式 https://developer.chrome.com/docs/android/intents
2026年11月のAndroid版Xメニュー紹介 https://engrmemo.jp/android/twitter-inner-browser-to-app/

## 2026-11-21：iOS長押しジェスチャーの11ケース比較

「長押しでSafariメニューが出る」場合と「白いリンクドラッグの小窓だけが出る」場合を切り分ける。すべて同じHTTPSゲームURLを指す普通のアンカーで、試験リンクにJavaScriptのジェスチャーイベントは付けない。

- P0: 基準、追加指定なし
- P1: HTML `draggable=false` のみ
- P2: CSS `-webkit-user-drag:none` のみ
- P3: P1+P2
- P4: `user-select:none; -webkit-user-select:none` （メニューまで消える可能性）
- P5: `touch-action:manipulation` のみ
- P6: `-webkit-touch-callout:default` のみ
- P7: 装飾用子`span`2つを追加
- P8: P7＋子要素だけ`pointer-events:none`
- P9: P7＋`-webkit-user-drag:none`
- P10: `draggable=true`（ドラッグ挙動の負の対照）

P1/P2/P4/P5/P6/P10はP0から原則1条件だけ変え、P8/P9はP7との比較に使う。大きなリンク・普通のテキストリンク・旧装飾カードは既存のまま残す。試行位置（テキスト中央／余白）を揃えて比較し、フォームに結果を記録する。

注意：`-webkit-touch-callout`は長押しメニューを制御するが、iOSのWebViewではアプリがコンテキストメニュー・ドラッグを独自に制御する。CSSが特定動作を保証するわけではなく、実機未検証。

資料： https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/-webkit-touch-callout
