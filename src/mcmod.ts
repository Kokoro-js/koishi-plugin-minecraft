import * as cheerio from "cheerio";

export interface Result {
  title: string;
  link: string;
  introduce: string;
}

export async function scrapeWebsite(url: string, litmit: number) {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  const results: Result[] = [];

  $(".search-result-list .result-item").each((index, element) => {
    const title = $(element).find(".head a").text();
    const link = $(element).find(".foot .info .value a").attr("href");
    const introduce = $(element).find(".body").text();
    // const category =  $(element).find('.head').text();
    if (results.length < litmit) {
      results.push({ title, link, introduce });
    }
    // 如果 category 没文本，就证明是大类分类
    // if (category) {
    //   results.push({title: category + title, link, introduce})
    // } else results.push({title, link, introduce}) // 以后再进行大类分类的判断
  });
  return results;
}
