// ==UserScript==
// @name         日空间高速 [修正版]
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  每 3 秒自動點贊所有未點贊動態，並高速滾動頁面
// @author       ChatGPT
// @match        https://user.qzone.qq.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function autoLike() {
        const likeBtns = document.querySelectorAll('a.qz_like_btn_v3[data-clicklog="like"]');
        likeBtns.forEach(btn => {
            // 檢查是否已點贊（通常已贊按鈕會有 "liked" 或 "item-like-on" 之類的class）
            if (!btn.classList.contains('item-like-on') && !btn.classList.contains('liked')) {
                btn.click();
                console.log('[點贊]', btn);
            }
        });
    }

    function autoScroll() {
        window.scrollBy(0, 300); // 每次滾動 300 像素
    }

    setInterval(autoLike, 3000); // 每 3 秒掃一次
    setInterval(autoScroll, 100); // 每 0.1 秒滾一次
})();
