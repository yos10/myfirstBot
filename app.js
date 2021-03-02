'use strict';
require('dotenv').config();
const Twitter = require('twitter-lite');
const cron = require('cron').CronJob;

const twitter = new Twitter({
  consumer_key: process.env.TWITTER_API_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_API_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_API_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_API_ACCESS_TOKEN_SECRET,
});

let checkedTweets = [];

function getHomeTimeLine() {
  twitter
    .get('statuses/home_timeline')
    .then((tweets) => {
       // 初回起動時は取得するだけで終了
       if (checkedTweets.length === 0) {
        tweets.forEach(function(homeTimeLineTweet, key) {
          checkedTweets.push(homeTimeLineTweet); // 配列に追加
        });

        return;
      }

      const newTweets = [];
      tweets.forEach(function(homeTimeLineTweet, key) {
        if (!isCheckedTweet(homeTimeLineTweet)) {
          responseHomeTimeLine(homeTimeLineTweet);
          newTweets.push(homeTimeLineTweet); // 新しいツイートを追加
        }
      });

      // 調査済みリストに追加と、千個を超えていたら削除
      checkedTweets = newTweets.concat(checkedTweets); // 配列の連結
      // 古い要素を消して要素数を1000個にする。
      if (checkedTweets.length > 1000) checkedTweets.length = 1000;
   })
    .catch((err) => {
      console.error(err);
    });
}

const botName = process.env.TWITTER_BOT_NAME;

function isCheckedTweet(homeTimeLineTweet) {
  // ボット自身のツイートは無視する。
  if (homeTimeLineTweet.user.screen_name === `${botName}`) {
    return true;
  }

  for (let checkedTweet of checkedTweets) {
    // 同内容を連続投稿をするアカウントがあるため、一度でも返信した内容は返信しない仕様にしています。
    if (checkedTweet.id_str === homeTimeLineTweet.id_str || checkedTweet.text === homeTimeLineTweet.text) {
      return true;
    }
  }

  return false;
}

const responses = ['面白い！', 'すごい！', 'なるほど！'];

function responseHomeTimeLine(homeTimeLineTweet) {
  const tweetMessage = '@' + homeTimeLineTweet.user.screen_name + '「' + homeTimeLineTweet.text + '」 ' + responses[Math.floor(Math.random() * responses.length)];
  twitter.post('statuses/update', {
    status: tweetMessage,
    in_reply_to_status_id: homeTimeLineTweet.id_str
  }).then((tweet) => {
    console.log(tweet);
  }).catch((err) => {
    console.error(err);
  });
}

const cronJob = new cron({
  cronTime: '00 0-59/3 * * * *', // ３分ごとに実行
  start: true, // newした後即時実行するかどうか
  onTick: function() {
    // getHomeTimeLine();
  }
});
// getHomeTimeLine();

const stream = twitter.stream('statuses/filter', { track: `@${botName}` })
  .on('data', (tweet) => {
    console.log(tweet.text);

    const tweetMessage = '@' + tweet.user.screen_name + ' 呼んだ？　(*´ω｀*)';
    twitter.post('statuses/update', {
      status: tweetMessage,
      in_reply_to_status_id: tweet.id_str
    })
    .then((tweet) => {
      console.log(tweet);
    })
    .catch((err) => {
      console.err(err);
    });
  })
  .on('error', (err) => {
    console.err(err);
  });
