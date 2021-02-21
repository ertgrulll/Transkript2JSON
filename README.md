# NKU Transkript2JSON

_Transkript2JSON_ programı, Namık Kemal Üniversitesi'ne ait .pdf uzantılı transkript dosyalarından json tipinde veri oluşturmak için yazılmış desktop uygulamasıdır. Electron.js ve Node.js kullanılarak geliştirilmiştir.

### Program

---

<ul>
  <li>
    <b>Bir veya daha fazla dosya seçilerek kullanılabilir:</b>
    <br />
    <p float="left">
      <img src="github_imgs/main_sc.png" width="455" height="355" hspace="40" />
    </p>
  </li>
  <br />
  <li>
    <b>Yüklenen dosya uzantısının pdf olup olmadığını kontrol eder, pdf uzantılı
      olmayan dosyalarda işleme devam etmez:</b>
    <br />
    <p float="left">
      <img
        src="github_imgs/extention_err.png"
        width="455"
        height="355"
        hspace="40"
      />
    </p>
  </li>
  <br />
  <li>
    <b>Yüklenen .pdf uzantılı dosyalarda NKU transkriptlerinin içerdiği anahtar
      kelimeleri kontrol eder, geçerli bir transkript değilse dosyada işleme
      devam etmez: </b>
    <br />
    <p float="left">
    <img
      src="github_imgs/file_content_err.png"
      width="455"
      height="355"
      hspace="40"
    />
    </p>
  </li>
  <br />
  <li>
    <b>Geçerli bir pdf yüklendiğinde dosyadaki metin verilerini alır, gerekli
      bilgileri çıkartır.</b>
    <br />
    <p float="left">
    <img
      src="github_imgs/processing.png"
      width="455"
      height="355"
      hspace="40"
    />
    </p>
  </li>
  <br />
  <li>
    <b>Bilgileri anahtar-değer şeklinde json veri formatına dönüştürür. </b>
  </li>
  <br />
  <li>
    <b>Transkript2JSON adında yeni bir klasör oluşturur ve 'eskidosyaadı.json'
      şeklinde kayıt eder.</b>
    <br />
    <p float="left">
        <img src="github_imgs/success.png" width="455" height="355" hspace="40" />
    </p>
  </li>
</ul>

### Kurulum

---

    Installer klasörü içerisindeki **Transkript2JSON_installer.msi** dosyası ile kurulum yapılıp kullanılabilir.
