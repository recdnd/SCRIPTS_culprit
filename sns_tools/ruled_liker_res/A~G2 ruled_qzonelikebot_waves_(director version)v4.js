// ==UserScript==
// @name         防重复语义分类暴力点赞器（A~G2规则）周期隨機版含cap v4.7
// @namespace    http://tampermonkey.net/
// @version      4.4
// @description  優化內存與崩潰風險、周期隨機，含cap，冷卻-啓用時間波動可改
// @author       ChatGPT&recdnd
// @match        *://user.qzone.qq.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const ENABLE_MIN = 1; // 啟用時間：最短X分鐘
    const ENABLE_MAX = 8; // 啟用時間：最長X分鐘
    const COOLDOWN_MIN = 20; // 冷卻期：最短X分鐘
    const COOLDOWN_MAX = 350; // 冷卻期：最長X分鐘

    let isActive = true; // ✅ 初始狀態為啟用
    let nextChangeTime = Date.now() + getRandomMinutes(ENABLE_MIN, ENABLE_MAX) * 60 * 1000;

    function getRandomMinutes(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // 動態開關控制
    setInterval(() => {
        const now = Date.now();
        if (now >= nextChangeTime) {
            isActive = !isActive;
            const nextWindow = isActive
            ? getRandomMinutes(ENABLE_MIN, ENABLE_MAX)
            : getRandomMinutes(COOLDOWN_MIN, COOLDOWN_MAX);
            nextChangeTime = now + nextWindow * 60 * 1000;
            console.log(isActive ? `✅ 啟動點贊器（${nextWindow}分鐘）` : `⏳ 進入冷卻（${nextWindow}分鐘）`);
        }
    }, 60 * 1000); // 每分鐘檢查一次


    const highRiskWords = [
        "扩列", "擴列", "跟风", "新朋友", "列表", "谢谢", "感谢", "认识", "加点",
        "不加", "轉發", "转发", "加我", "想加", "约稿", "贊", "轉發", "转发", "赞", "不要", "別", "一起", "有人"
    ];

    let likedSet = new WeakSet();
    let likeIndex = 0;
    const LIKE_BATCH_SIZE = 5;
    let scrollY = 0;
    const maxScrollY = 40000;
    let totalLikes = 0;
    const MAX_LIKES_PER_SESSION = 40;


    function waitForjQuery(callback) {
        if (typeof window.jQuery === 'undefined') {
            console.log("等待 jQuery...");
            setTimeout(() => waitForjQuery(callback), 500);
        } else {
            callback(window.jQuery);
        }
    }

    waitForjQuery(($) => {
        function getLikeCount($item) {
            let text = $item.closest('.f-single').find('.f-like-cnt').text();
            return parseInt(text) || 0;
        }

        function hasImage($item) {
            return $item.closest('.f-single').find('.photo-list img, .img-box img').length > 0;
        }

        function isSelfPost($item) {
            const $post = $item.closest('.f-single');
            const $avatar = $post.find('.user-avatar');
            const userId = $avatar.attr('href')?.match(/\/(\d+)/)?.[1];
            try {
                const currentUid = QZONE.FP.getQzoneConfig().ownerUin.toString();
                return userId === currentUid;
            } catch (e) {
                return false;
            }
        }

        function isForwardPost($item) {
            return $item.closest('.f-single').find('.qz_summary a.nickname').length > 0;
        }

        function containsHighRiskWords($item) {
            const text = $item.closest('.f-single').text();
            return highRiskWords.some(word => text.includes(word));
        }

        function isOriginalPost($item) {
            return !isForwardPost($item);
        }

        function hasRetweetComment($item) {
            const textBox = $item.closest('.f-single').find('.f-ct .txt-box').first().text().trim();
            return textBox.length > 0;
        }

        function handleLike($item) {
            if ($item.hasClass('liked') || likedSet.has($item[0])) return;

            const self = isSelfPost($item);
            const img = hasImage($item);
            const likeCount = getLikeCount($item);
            const forward = isForwardPost($item);
            const risky = containsHighRiskWords($item);
            const original = isOriginalPost($item);
            const hasComment = hasRetweetComment($item);

            const hasMyMainAccount = $item.closest('.f-single').find('.f-like-list .user-list').text().includes('館長');
            if (hasMyMainAccount) return;

            if (self && original && !img && likeCount < 5) return;
            if (self && !original && !hasComment) return;

            if (self && !original && likeCount < 5 && hasComment) {
                $item.trigger('click');
                likedSet.add($item[0]);
                console.log("✅ G1類");
                return;
            }

            if (self && original && likeCount >= 5) {
                $item.trigger('click');
                likedSet.add($item[0]);
                console.log("✅ B1類");
                return;
            }

            if (self && !original && !img && likeCount >= 5) {
                if (Math.random() < 0.2) {
                    $item.trigger('click');
                    likedSet.add($item[0]);
                    console.log("🎯 B2類");
                }
                return;
            }

            if (forward && risky) return;
            if (self && img) {
                $item.trigger('click');
                likedSet.add($item[0]);
                console.log("✅ D類");
                return;
            }

            if (self && original && risky) return;

            if (!self && forward && !risky) {
                if (Math.random() < 0.1) {
                    $item.trigger('click');
                    likedSet.add($item[0]);
                    console.log("🎲 F類");
                }
                return;
            }

            $item.trigger('click');
            likedSet.add($item[0]);
            console.log("💥 Default");
        }

        function autoLike() {
            if (totalLikes >= MAX_LIKES_PER_SESSION) {
                console.log("🛑 已達到本次會話點贊上限");
                return;
            }

            const $likeButtons = $("a.qz_like_btn_v3[data-clicklog='like']").not('.liked');
            if ($likeButtons.length === 0) return;

            for (let i = 0; i < LIKE_BATCH_SIZE && totalLikes < MAX_LIKES_PER_SESSION; i++) {
                const item = $likeButtons[likeIndex % $likeButtons.length];
                likeIndex++;
                try {
                    handleLike($(item));
                    totalLikes++;
                } catch (err) {
                    console.warn("🚨 點贊錯誤", err);
                }
            }
        }


        setInterval(() => {
            if (!isActive) return;

            if (scrollY > maxScrollY) scrollY = 0;
            scrollY += 2000 + Math.random() * 1000;
            $('html, body').scrollTop(scrollY);

            try {
                autoLike();
            } catch (e) {
                console.warn("🛑 autoLike 崩潰：", e);
            }
        }, 800);


        setInterval(() => {
            console.log("🔁 自動刷新頁面");
            location.reload();
        }, 3 * 60 * 60 * 1000); // 每3小時

        setInterval(() => {
            console.log("🧹 清理 likedSet");
            likedSet = new WeakSet();// GC
        }, 60 * 60 * 1000);// 每小時
    });
})();
