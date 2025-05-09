// ==UserScript==
// @name         異常檢測與節律刷新器（含冷靜期提示）
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  檢測頁面卡住或誤入「與我相關」，自動修復並根據時間節律定期刷新；冷靜期內禁止點讚，並顯示視覺提示！順便含有刷新功能，搭配暴力點贊器使用！
// @match        https://user.qzone.qq.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const DETECTION_INTERVAL = 3000;
    const MAX_STAGNANT_TICKS = 4;
    let lastScrollTop = 0;
    let stagnantCount = 0;

    // 時間節律設置（根據本地時間 hour）
    const now = new Date();
    const hour = now.getHours();
    let refreshInterval = 1000 * 60 * 40; // 預設：每 20 分鐘刷新

    // 冷靜期設定（例如 3:00~6:00 不點讚）
    const isCooldownPeriod = hour >= 3 && hour < 6;
    if (isCooldownPeriod) {
        refreshInterval = 1000 * 60 * 80; // 冷靜期：改為每 80 分鐘刷新
    } else if (hour >= 9 && hour <= 19) {
        refreshInterval = 1000 * 60 * 15; // 白天高頻刷新
    }

    console.log(`[節律] 當前時間 ${hour} 點，刷新間隔設為 ${refreshInterval / 60000} 分鐘。`);

    // 冷靜期標示視覺提示
    if (isCooldownPeriod) {
        const label = document.createElement('div');
        label.textContent = '🌙 冷靜期中（僅滾動無點讚）';
        label.style.position = 'fixed';
        label.style.bottom = '10px';
        label.style.right = '10px';
        label.style.background = '#333';
        label.style.color = '#fff';
        label.style.padding = '6px 12px';
        label.style.borderRadius = '8px';
        label.style.fontSize = '12px';
        label.style.zIndex = '99999';
        label.style.opacity = '0.85';
        document.body.appendChild(label);
    }

    // 定時刷新
    setTimeout(() => {
        console.log('[刷新] 觸發節律刷新');
        location.reload();
    }, refreshInterval);

    function isInFriendStreamView() {
        const titleSpan = document.querySelector('.qz-main span.sn-title');
        return titleSpan && titleSpan.textContent.includes('好友动态');
    }

    function clickBackToFriendStream() {
        const nav = document.querySelector('.qz-main span.sn-title');
        if (nav && nav.textContent.includes('好友动态')) {
            nav.click();
            console.log('[導航] 點擊好友動態以返回主視圖');
        }
    }

    function monitorStagnation() {
        const currentTop = document.documentElement.scrollTop || document.body.scrollTop;

        if (currentTop === lastScrollTop) {
            stagnantCount++;
        } else {
            stagnantCount = 0;
        }

        lastScrollTop = currentTop;

        if (stagnantCount >= MAX_STAGNANT_TICKS || !isInFriendStreamView()) {
            console.warn('[異常] 檢測到卡住或誤入與我相關，正在嘗試恢復...');
            clickBackToFriendStream();
            setTimeout(() => location.reload(), 1000);
        }
    }

    setInterval(monitorStagnation, DETECTION_INTERVAL);
})();