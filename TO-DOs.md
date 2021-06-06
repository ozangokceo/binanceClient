-----TO-DOs----- 21 May 2021
--Tred vektörü 1 , -1 li kesin sayılar yerine anlık hassas değer yapılacak. 1.0334 , 0.997 gibi yüzde sayısı olacak.  -------------------------------------------OK--

--Trend vektör SADECE belli bir yüzdeyi görünce alış ya da satış yapılacak. Hemen en ufak bir harekette minik dalgalanmada gereksiz al sat olmayacak. -----------OK'ish.. Hysteresis set..

--Düşüş koruması(fall protection) fonksiyonu yapılacak. Büyük hızda bir düşüş , uzun süre (60 saniye gibi..) devam ediyorsa frene basılacak.  -------------------OK--
  -Leveraged token çiftlerinde (ETHUP/ETHDOWN) ikisi birden belli bir süre düşüş yaşadığında frene basılacak.----------------------------------------------------OK--

--Terminal arayüz düzeltmeleri

--Kod , modüler hale getirilecek(code splitting). Değişik fonksiyonlar ayrı js lere alınacak

--TrendvectorHistoryArray gecikmeli gösteriliyor. al sat da buna bağlı gecikiyor. gereksiz 2 cycle (2 dk) zaman kaybediliyor. Bu düzeltilecek -------------------OK--

--Kod yazımına GitHub zorunluluğu.. GitHub entegrasyonu tam hale getirilecek.

--AL/SAT da halen bi gecikme bi lag var gibi............................



--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
----binanceClient v1.1 Çıkış tarihi 22 May 2021 
    --Düzeltmeler;
        -Trend vektörü 0, 1 gibi kesin sayılar yerine , 1.02 0.98.. gibi yüzdeli sayılar olarak değiştirildi.
        -Trend vektörü 1 (yukarı) göstermesine rağmen geç alım/satım yapıyordu. Gereksiz yere 1 dakika gecikmeli alım satım oluyordu. Düzeltildi
        - Hysteresis ayarlama imkanı getirildi. (Ufak dalgalanmalarda zırt pırt alım satım yapmasın diye..)
        - Iki coin'in de aynı anda acil düşüşüne karşı acil stop fonksiyonu yazıldı. (fallProtection())