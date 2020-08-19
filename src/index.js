/* eslint-disable no-undef */
/* eslint-disable func-names */
/* eslint-disable no-console */
const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');
const _ = require('lodash');
const XLSX = require('xlsx');

puppeteer.use(pluginStealth());

puppeteer
  .launch({
    headless: false,
    // defaultViewport: null,
    args: ['--start-maximized'],
  })
  .then(async (browser) => {
    const page = await browser.newPage();
    await page.goto(
      'https://consultapublica.antt.gov.br/Site/ConsultaRNTRC.aspx'
    );
    await page.click(
      '#Corpo_rbTipoConsulta > tbody > tr > td:nth-child(2) > label'
    );
    await page.waitFor(2000);
    await page.select('#Corpo_ddlTipo', 'ETC');
    await page.waitFor(2000);
    await page.select('#Corpo_ddlUF', 'SP');
    await page.waitFor(2000);
    await page.select('#Corpo_ddlMunicipio', '9013');
    await page.waitFor(2000);
    await page.click('#Corpo_btnConsulta');
    await page.waitFor(2000);

    // Captcha Google

    const fileData = [];

    async function getData() {
      const company = await page.evaluate(() => {
        const divs = [
          ...document.querySelectorAll(
            '#Corpo_gvResultadoPesquisa > tbody > tr:nth-child(n) > td:nth-child(n)'
          ),
        ];
        return divs.map((div) => {
          return div.innerText;
        });
      });

      const nextPage = await page.$(
        '#Corpo_ucPaginatorConsultaPesquisa > ul > li.next'
      );

      if (nextPage !== null) {
        await page.click('#Corpo_ucPaginatorConsultaPesquisa > ul > li.next');
        await page.waitFor(1000);
        fileData.push(company);
        await getData();
      } else {
        fileData.push(company);
        console.log('End');
      }
    }

    await getData();

    const flattenFileData = _.flattenDeep(fileData);
    const flattenAndSeparatedFileData = _.chunk(flattenFileData, 5);

    fs.writeFile(
      './src/data/data.json',
      JSON.stringify(flattenAndSeparatedFileData, null, 2),
      function (err) {
        if (err) throw err;
        console.log('Arquivo Gerado');
      }
    );

    const workSheet = XLSX.utils.json_to_sheet(flattenAndSeparatedFileData);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, workSheet, 'info_extract');
    XLSX.writeFile(wb, './src/data/data.xlsb');

    await browser.close();
  });
