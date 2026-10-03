// ============================================================================
// ROUND 60 -- THE EFFECT LIBRARY.
//
// 1,050 spell animations, measured rather than hand-labelled. Each arrives as
// a 64px greyscale strip (the artist ships a zero-saturation master row; the
// eight colour rows are pixel-identical in shape, so shipping one and tinting
// on the GPU costs 1/17th the bytes and reaches any colour the generator can
// produce, including confluence blends no fixed palette would have).
//
// WHAT THE MEASUREMENTS ARE. For every effect: shape (beam / spray / ring /
// sigil / round), motion (expand / hold / contract), size, whether it turns as
// it plays, and whether it is still on screen when the strip ends. Those are
// geometry, not opinion -- computed from the alpha channel in fx_measure.py --
// and they are what decides which family an effect can honestly play.
//
// WHY POOLS. FAMILY_TOKENS in spellFx.js already reads an ability's text and
// says "this is a ward" or "this is a hex". That vocabulary is not replaced.
// What changes is that each answer now names a POOL of effects rather than one
// sheet, so `bubble` has 23 looks instead of one and two wards in a kit do not
// cast identically.
//
// TWO FAMILIES ARE NEW, and both were found by measuring coverage rather than
// by taste. `impact` (239 effects) is a mass that flares in place and fades --
// the ordinary landed blow, which had no art at all when the library was 240
// sheets and the generic case was simply `explosion`. `slash` (172) is an arc
// swung across, the swing of a weapon. Without them 365 effects -- a third of
// the library -- were unreachable by any family.
//
// Reachable: 1048/1050.
// ============================================================================

/** id -> 'SMZ[s][p]frames'. S shape (b/y/r/g/o), M motion (e/h/c),
 *  Z size (s/m/l), then s if it spins, p if it persists, then frame count. */
export const FX_EFFECTS = {
  750:'rhm7', 751:'ohs7', 752:'ghm7', 753:'ohm7', 754:'oes7', 755:'oess7',
  756:'oem7', 757:'oes7', 758:'oem7', 759:'yhm7', 760:'yhm7', 761:'yess7',
  762:'yhms7', 763:'oem7', 764:'bhm7', 765:'oes8', 766:'gcm8', 767:'ohm8',
  768:'ohm8', 769:'gcl8', 770:'ghs8', 771:'gcm8', 772:'oems8', 773:'yem8',
  774:'ohmp8', 775:'yhlp8', 776:'ohmp8', 777:'yhlp8', 778:'ohm8', 779:'ohm8',
  780:'ohm8', 781:'ohs8', 782:'yem8', 783:'oes8', 784:'bes8', 785:'oes8',
  786:'ohm8', 787:'bhm8', 788:'gem8', 789:'oem8', 790:'ocss9', 791:'ohs9',
  792:'oem9', 793:'oel9', 794:'oes9', 795:'gem9', 796:'oel9', 797:'oem9',
  798:'ocm9', 799:'ohm9', 800:'oem9', 801:'ghl9', 802:'ohm9', 803:'yem10',
  804:'bcm10', 805:'ocm10', 806:'ohl10', 807:'ocl10', 808:'bcm10', 809:'ohm10',
  810:'ohm10', 811:'ocl10', 812:'oem10', 813:'oems10', 814:'oes10', 815:'oem10',
  816:'bem10', 817:'ohm10', 818:'oem10', 819:'oem10', 820:'oel10', 821:'oem10',
  822:'ohl10', 823:'ohm10', 824:'ohm10', 825:'ohl10', 826:'oel10', 827:'ohl10',
  828:'oem10', 829:'gem10', 830:'ohm10', 831:'oel10', 832:'oel10', 833:'oem10',
  834:'oem10', 835:'oem10', 836:'oem10', 837:'ohl10', 838:'oem10', 839:'ycm11',
  840:'rcs11', 841:'rcm11', 842:'rcm11', 843:'ocm11', 844:'ocl11', 845:'ocm11',
  846:'rcs11', 847:'oes11', 848:'oem11', 849:'oem11', 850:'bem9', 851:'oem9',
  852:'ohm9', 853:'gess10', 854:'ocms10', 855:'ycls10', 856:'bcms10', 857:'bcms10',
  858:'bcls10', 859:'ycls10', 860:'oem11', 861:'oem11', 862:'oem11', 863:'oel11',
  864:'ohm11', 865:'oem11', 866:'oem11', 867:'oem11', 868:'yhs11', 869:'yem11',
  870:'yhl11', 871:'yhm11', 872:'ycm11', 873:'yhm11', 874:'ycm11', 875:'yhm11',
  876:'bhm11', 877:'yem11', 878:'bhss11', 879:'ocms11', 880:'bhss11', 881:'ghss11',
  882:'yems11', 883:'ges11', 884:'bhms11', 885:'bhms11', 886:'bhms11', 887:'bem11',
  888:'bem11', 889:'ohm11', 890:'bhl11', 891:'yel11', 892:'yem11', 893:'bcms11',
  894:'ocms11', 895:'bcls11', 896:'ycls11', 897:'gcms11', 898:'bcms11', 899:'ycms11',
  900:'bcms11', 901:'bcls11', 902:'oes11', 903:'oel11', 904:'oem11', 905:'ohl11',
  906:'oes11', 907:'rem12', 908:'rem12', 909:'oel12', 910:'ohl12', 911:'oes12',
  912:'gem12', 913:'ohm12', 914:'oem12', 915:'oem12', 916:'ohm12', 917:'ohl12',
  918:'ghl12', 919:'yhl12', 920:'ohmp12', 921:'ohm12', 922:'ohm12', 923:'ohm12',
  924:'ohs12', 925:'oem12', 926:'bhl12', 927:'ohs12', 928:'bhl12', 929:'ocl12',
  930:'ohm12', 931:'oem12', 932:'ohm12', 933:'ghm12', 934:'bcl12', 935:'yem12',
  936:'bhs12', 937:'bhl12', 938:'ocm12', 939:'ohm12', 940:'ocl12', 941:'bhl12',
  942:'bhm12', 943:'ocm12', 944:'bcm12', 945:'ocm12', 946:'ocm12', 947:'ocm12',
  948:'bcl12', 949:'gcm12', 950:'bel12', 951:'ohl12', 952:'ocl12', 953:'ohss12',
  954:'ocm12', 955:'yes12', 956:'bem12', 957:'bcl12', 958:'oel12', 959:'bhm12',
  960:'bcm12', 961:'ohs12', 962:'ohm12', 963:'ohm12', 964:'ghm12', 965:'ohm12',
  966:'ohm12', 967:'ocl12', 968:'ocm12', 969:'ohs12', 970:'ohl12', 971:'oem12',
  972:'ohl12', 973:'ghl12', 974:'oem12', 975:'ohm12', 976:'oes12', 977:'oes12',
  978:'oes12', 979:'oem12', 980:'ohm12', 981:'oes12', 982:'oem12', 983:'ohm12',
  984:'oem12', 985:'ohm12', 986:'ohm12', 987:'ohm12', 988:'ohm12', 989:'oes12',
  990:'ohs12', 991:'ohsp12', 992:'ohsp12', 993:'ohmp12', 994:'ohmp12', 995:'bhm12',
  996:'bhs12', 997:'ohsp12', 998:'oem12', 999:'ghss12', 1000:'ohm12', 1001:'bhm12',
  1002:'bhm12', 1003:'ghm12', 1004:'bhl12', 1005:'oem12', 1006:'oes12', 1007:'oem12',
  1008:'oes12', 1009:'oem12', 1010:'yhm12', 1011:'ghs12', 1012:'ohs12', 1013:'ohms12',
  1014:'ohssp12', 1015:'ohssp12', 1016:'ohsp12', 1017:'bhmp12', 1018:'oems12', 1019:'ohmp12',
  1020:'ohmsp12', 1021:'ohssp12', 1022:'ghssp12', 1023:'ghmsp12', 1024:'ges12', 1025:'oem12',
  1026:'bcls12', 1027:'ohms12', 1028:'ohsp12', 1029:'ghsp12', 1030:'bcm12', 1031:'oem12',
  1032:'oelp12', 1033:'oemp12', 1034:'oem12', 1035:'bhlp12', 1036:'ohmp12', 1037:'gem12',
  1038:'ohmp12', 1039:'ocs12', 1040:'ocl12', 1041:'ocm12', 1042:'ocl12', 1043:'ocm12',
  1044:'ocls12', 1045:'ocls12', 1046:'bcms12', 1047:'yelp12', 1048:'yelp12', 1049:'bem12',
  1050:'ocl12', 1051:'ycl12', 1052:'ycl12', 1053:'ycl12', 1054:'ohm12', 1055:'ycmp12',
  1056:'yclp12', 1057:'ycmp12', 1058:'ycmp12', 1059:'ohmp12', 1060:'ohlp12', 1061:'ycmp12',
  1062:'yclp12', 1063:'ohmp12', 1064:'yhmp12', 1065:'bhmsp12', 1066:'ghmsp12', 1067:'yhmp12',
  1068:'bhsp12', 1069:'bhsp12', 1070:'ycm12', 1071:'gcs12', 1072:'yhm12', 1073:'yhm12',
  1074:'oem12', 1075:'ohs12', 1076:'ohm12', 1077:'oem12', 1078:'oem12', 1079:'oem12',
  1080:'oem12', 1081:'ohl12', 1082:'bhm12', 1083:'ohm12', 1084:'yhl12', 1085:'bhlp12',
  1086:'ohlp12', 1087:'ohlp12', 1088:'ohlp12', 1089:'bhlp12', 1090:'oem12', 1091:'oem12',
  1092:'yhl12', 1093:'ghm12', 1094:'gclp12', 1095:'rcl12', 1096:'ghl12', 1097:'ohm12',
  1098:'ohm12', 1099:'ghl12', 1100:'yhms7', 1101:'yhss7', 1102:'ohs7', 1103:'ocm7',
  1104:'rhss7', 1105:'yclp7', 1106:'yes7', 1107:'ocmp7', 1108:'ohs7', 1109:'ocs7',
  1110:'bhs7', 1111:'gcl7', 1112:'oesp7', 1113:'ges7', 1114:'rhmp7', 1115:'bcms7',
  1116:'bcls7', 1117:'bcms7', 1118:'bcms7', 1119:'bhms7', 1120:'bcms7', 1121:'oem8',
  1122:'ycm8', 1123:'oem8', 1124:'oem8', 1125:'oes8', 1126:'yel8', 1127:'oem8',
  1128:'oem8', 1129:'bhs8', 1130:'ohlp8', 1131:'bhss8', 1132:'ghlp8', 1133:'ohm8',
  1134:'oes8', 1135:'oes8', 1136:'bhl8', 1137:'ghl8', 1138:'bels8', 1139:'bems8',
  1140:'oems8', 1141:'bems8', 1142:'gcs8', 1143:'bems8', 1144:'oem8', 1145:'res8',
  1146:'oes8', 1147:'oem8', 1148:'ghm8', 1149:'ghls8', 1150:'ghm8', 1151:'ohs8',
  1152:'ghms8', 1153:'ohm8', 1154:'bes8', 1155:'bes8', 1156:'gcmp8', 1157:'ycl8',
  1158:'ghss8', 1159:'bhsp8', 1160:'yem8', 1161:'gem8', 1162:'ohss8', 1163:'ghss8',
  1164:'ghmp8', 1165:'ocl8', 1166:'ghs8', 1167:'ghmp8', 1168:'ghsp8', 1169:'ohsp8',
  1170:'ghmp8', 1171:'ohmp8', 1172:'ohssp8', 1173:'ghlp8', 1174:'ghmp8', 1175:'ohlp8',
  1176:'oem9', 1177:'bel9', 1178:'gem9', 1179:'bem9', 1180:'oem9', 1181:'oem9',
  1182:'oem9', 1183:'bcm9', 1184:'ocm9', 1185:'bhmp9', 1186:'ohmp9', 1187:'bhmp9',
  1188:'bhm9', 1189:'ohm9', 1190:'rhm9', 1191:'bhl9', 1192:'ohs9', 1193:'bhl9',
  1194:'ohm9', 1195:'bhm9', 1196:'ohl9', 1197:'ohm9', 1198:'oem9', 1199:'ocm9',
  1200:'bhlp9', 1201:'yhm9', 1202:'yem9', 1203:'ohsp9', 1204:'ghl9', 1205:'ghm9',
  1206:'rhls9', 1207:'ohm9', 1208:'ohs9', 1209:'oes9', 1210:'bhs9', 1211:'ghsp9',
  1212:'ocm9', 1213:'ocs9', 1214:'yhm9', 1215:'ohssp9', 1216:'ohm9', 1217:'rhm9',
  1218:'bhm9', 1219:'ohm9', 1220:'ohms9', 1221:'bhs9', 1222:'bhs9', 1223:'bhlp9',
  1224:'bel9', 1225:'yel9', 1226:'gemp9', 1227:'gem9', 1228:'oes9', 1229:'oems9',
  1230:'ohmp9', 1231:'gcm9', 1232:'bclsp9', 1233:'gcm9', 1234:'oes10', 1235:'bhl10',
  1236:'yem10', 1237:'oem10', 1238:'oes10', 1239:'ohm10', 1240:'ohl10', 1241:'gem10',
  1242:'gem10', 1243:'oem10', 1244:'oes10', 1245:'oem10', 1246:'yel10', 1247:'bel10',
  1248:'oems10', 1249:'rhms10', 1250:'bhms10', 1251:'ghms10', 1252:'bhls10', 1253:'oes10',
  1254:'ohsp10', 1255:'bem10', 1256:'bem10', 1257:'bem10', 1258:'ocm10', 1259:'ghm10',
  1260:'oel10', 1261:'oel10', 1262:'oel10', 1263:'bhs10', 1264:'ohs10', 1265:'ges10',
  1266:'gem10', 1267:'gem10', 1268:'gem10', 1269:'oem10', 1270:'ohl10', 1271:'ohls12',
  1272:'ghl10', 1273:'ghl10', 1274:'ohlp10', 1275:'gel10', 1276:'ghs10', 1277:'gcm10',
  1278:'gcl10', 1279:'gem10', 1280:'yel10', 1281:'ohmp10', 1282:'ohssp10', 1283:'ghmsp10',
  1284:'ghmp10', 1285:'ghmsp10', 1286:'oems10', 1287:'oem10', 1288:'ohl11', 1289:'ycls11',
  1290:'yem11', 1291:'ohm11', 1292:'bhmsp11', 1293:'yes11', 1294:'rem11', 1295:'oem11',
  1296:'ohm11', 1297:'ohm11', 1298:'ohm11', 1299:'ghl11', 1300:'bels9', 1301:'oel9',
  1302:'ocl9', 1303:'yhls9', 1304:'oem11', 1305:'yhlp11', 1306:'bhmp11', 1307:'oem11',
  1308:'bem11', 1309:'oem11', 1310:'bhl11', 1311:'bhmp11', 1312:'ohmp11', 1313:'ocls11',
  1314:'ocls11', 1315:'rcl11', 1316:'bhmp11', 1317:'bhmp11', 1318:'oes11', 1319:'oem11',
  1320:'rem11', 1321:'oem11', 1322:'oem11', 1323:'oem11', 1324:'gem11', 1325:'ghm11',
  1326:'bem11', 1327:'ohl11', 1328:'bem11', 1329:'oem11', 1330:'oel11', 1331:'ghm11',
  1332:'oem11', 1333:'ghmp11', 1334:'yem11', 1335:'gcl11', 1336:'yhl11', 1337:'bel11',
  1338:'oem11', 1339:'oem11', 1340:'bem11', 1341:'gem11', 1342:'bel11', 1343:'oem11',
  1344:'yel11', 1345:'oel11', 1346:'rem11', 1347:'rem11', 1348:'ghm11', 1349:'ghm11',
  1350:'bhmp12', 1351:'oem12', 1352:'yel12', 1353:'gem12', 1354:'res12', 1355:'ohl12',
  1356:'oem12', 1357:'ohl12', 1358:'bel12', 1359:'ohm12', 1360:'yem12', 1361:'oes12',
  1362:'bhs12', 1363:'bhl12', 1364:'yhm12', 1365:'bhms12', 1366:'rem12', 1367:'ghm12',
  1368:'ohmp12', 1369:'ohm12', 1370:'ghm12', 1371:'ohm12', 1372:'oem12', 1373:'ohs12',
  1374:'bem12', 1375:'oems12', 1376:'ohms12', 1377:'oems12', 1378:'ohm12', 1379:'oem12',
  1380:'bhls12', 1381:'ohls12', 1382:'ohl12', 1383:'ohms12', 1384:'oems12', 1385:'ohm12',
  1386:'ghls12', 1387:'ghm12', 1388:'oem12', 1389:'ress12', 1390:'bhlp12', 1391:'ohm12',
  1392:'bel12', 1393:'gcl12', 1394:'bem12', 1395:'gem12', 1396:'oem12', 1397:'oes12',
  1398:'ghs12', 1399:'bem12', 1400:'rhm12', 1401:'ghm12', 1402:'gem12', 1403:'oes12',
  1404:'oes12', 1405:'ohs12', 1406:'oel12', 1407:'ohm12', 1408:'ghss13', 1409:'ohm13',
  1410:'oels13', 1411:'oels13', 1412:'oel13', 1413:'oels13', 1414:'ghm13', 1415:'ohms13',
  1416:'ghs13', 1417:'ghs13', 1418:'ghm13', 1419:'oes13', 1420:'ghm13', 1421:'ghl13',
  1422:'ohl13', 1423:'yem13', 1424:'oel13', 1425:'gel13', 1426:'oes13', 1427:'oel13',
  1428:'ohm13', 1429:'ohm13', 1430:'ohm13', 1431:'bem13', 1432:'oes13', 1433:'ohm13',
  1434:'ohmp13', 1435:'bhm13', 1436:'bhl13', 1437:'ghm13', 1438:'yhl13', 1439:'ohm13',
  1440:'yhm13', 1441:'yhm13', 1442:'oem13', 1443:'oem13', 1444:'bcm13', 1445:'ohm13',
  1446:'ohs13', 1447:'rel13', 1448:'oes13', 1449:'oem13', 1450:'ohs13', 1451:'oem13',
  1452:'ohs13', 1453:'ohs13', 1454:'ohs13', 1455:'oess13', 1456:'oes13', 1457:'oem13',
  1458:'ohl13', 1459:'oem13', 1460:'oes13', 1461:'bem13', 1462:'ohs13', 1463:'oem13',
  1464:'oems13', 1465:'bhmsp12', 1466:'oems13', 1467:'oems13', 1468:'ohsp13', 1469:'bhs13',
  1470:'ghs13', 1471:'bhl13', 1472:'ohmp13', 1473:'ohm13', 1474:'bhm13', 1475:'ohm13',
  1476:'ohm13', 1477:'ohm13', 1478:'ohm13', 1479:'ohm13', 1480:'ohm13', 1481:'ohls13',
  1482:'ohms13', 1483:'bes13', 1484:'oem13', 1485:'rhmp13', 1486:'ghlsp13', 1487:'ohms13',
  1488:'rhm13', 1489:'ghmp13', 1490:'ocs13', 1491:'ohm13', 1492:'ocm13', 1493:'ohm13',
  1494:'ycl13', 1495:'ghm13', 1496:'ohs13', 1497:'ohm13', 1498:'yhm13', 1499:'rcss13',
  1500:'bhl13', 1501:'bhms13', 1502:'bhl13', 1503:'bhms13', 1504:'oem13', 1505:'oem13',
  1506:'ohs13', 1507:'bcms13', 1508:'ycm13', 1509:'oem13', 1510:'oes13', 1511:'bem13',
  1512:'oem13', 1513:'oem13', 1514:'oem13', 1515:'oem13', 1516:'bhm13', 1517:'oem13',
  1518:'yhl13', 1519:'oem13', 1520:'ohmp13', 1521:'ohmp14', 1522:'ohm14', 1523:'ocm14',
  1524:'ohm14', 1525:'bes14', 1526:'bem14', 1527:'yhs14', 1528:'ohs14', 1529:'bhs14',
  1530:'bhs14', 1531:'bhs14', 1532:'oems14', 1533:'ohm13', 1534:'res13', 1535:'ohs14',
  1536:'ohlp15', 1537:'ohm14', 1538:'ohmp14', 1539:'ohlp15', 1540:'ohs14', 1541:'yhm14',
  1542:'rhm14', 1543:'ohl14', 1544:'ohm14', 1545:'yhm14', 1546:'ohs14', 1547:'ohsp14',
  1548:'ohs14', 1549:'ohs14', 1550:'ohms14', 1551:'ohl14', 1552:'yhl14', 1553:'ohm14',
  1554:'yhm14', 1555:'ohm14', 1556:'bhs14', 1557:'oes14', 1558:'yem14', 1559:'yhm14',
  1560:'yhl14', 1561:'yhl14', 1562:'yhm14', 1563:'yhs14', 1564:'yhm14', 1565:'yhs14',
  1566:'oem14', 1567:'oem14', 1568:'oel14', 1569:'oel14', 1570:'yhms14', 1571:'ohls14',
  1572:'ohs14', 1573:'ohm14', 1574:'ohsp14', 1575:'ohmp14', 1576:'ohl14', 1577:'ohl14',
  1578:'ohm14', 1579:'ohl14', 1580:'yhm14', 1581:'gcs14', 1582:'rcs14', 1583:'ycm14',
  1584:'ycl14', 1585:'ocm14', 1586:'ohl14', 1587:'ohm14', 1588:'ohl14', 1589:'oel14',
  1590:'yhl14', 1591:'ohl14', 1592:'ohm14', 1593:'ycl14', 1594:'ohmp15', 1595:'yhm14',
  1596:'bhl14', 1597:'ohss14', 1598:'ohs14', 1599:'ohl14', 1600:'ohm14', 1601:'ohs14',
  1602:'ohs14', 1603:'oes14', 1604:'ohm14', 1605:'ocm14', 1606:'ohm14', 1607:'ohm14',
  1608:'ycl14', 1609:'rhs14', 1610:'ocm14', 1611:'gcss14', 1612:'rhms14', 1613:'bhms14',
  1614:'yhls14', 1615:'ohms14', 1616:'ohms14', 1617:'ohm14', 1618:'yhl14', 1619:'yhl14',
  1620:'yhl14', 1621:'yhl14', 1622:'yhm14', 1623:'yhl14', 1624:'yhmsp14', 1625:'yhlp14',
  1626:'ghlp14', 1627:'ycm14', 1628:'bcm14', 1629:'ycs14', 1630:'ycm14', 1631:'bhm14',
  1632:'ghs14', 1633:'bhs14', 1634:'bhm14', 1635:'bem14', 1636:'gcl14', 1637:'bhs14',
  1638:'ohs14', 1639:'rhm14', 1640:'ohm14', 1641:'ohs14', 1642:'bhm14', 1643:'ohm14',
  1644:'bcs14', 1645:'ohmp14', 1646:'ohmp14', 1647:'ohmp15', 1648:'ohss14', 1649:'ohs14',
  1650:'ohm14', 1651:'ghl14', 1652:'ohm14', 1653:'oem14', 1654:'bhs14', 1655:'ohm14',
  1656:'ohm14', 1657:'ohm14', 1658:'ocm14', 1659:'ghl14', 1660:'bhmp14', 1661:'ohmp14',
  1662:'ohmp14', 1663:'ohmp14', 1664:'ohmp14', 1665:'ohmp14', 1666:'ohmp14', 1667:'ohsp14',
  1668:'ohsp14', 1669:'ohlp14', 1670:'ghlp14', 1671:'ohmp14', 1672:'ohsp14', 1673:'ohs14',
  1674:'ohs14', 1675:'yhl14', 1676:'ohm14', 1677:'bhls14', 1678:'bhls14', 1679:'ohms14',
  1680:'ohm14', 1681:'ohm14', 1682:'ohs15', 1683:'ohm15', 1684:'ohm15', 1685:'ohm15',
  1686:'ohm15', 1687:'rhm15', 1688:'rhm15', 1689:'ohm15', 1690:'ohm15', 1691:'rhm15',
  1692:'ghmp15', 1693:'ohmp15', 1694:'ghmsp15', 1695:'ghlp15', 1696:'ocmp15', 1697:'ohlp15',
  1698:'bcmsp15', 1699:'ghmsp15', 1700:'ohsp15', 1701:'ohsp15', 1702:'gcs15', 1703:'ohsp15',
  1704:'ohmp15', 1705:'ohmp15', 1706:'ohsp15', 1707:'bcssp15', 1708:'ohs15', 1709:'ohmp15',
  1710:'ohm15', 1711:'ohmp15', 1712:'yel15', 1713:'ohss15', 1714:'yhm15', 1715:'ocm15',
  1716:'yhl15', 1717:'ohs15', 1718:'yhm15', 1719:'ohs15', 1720:'ghm15', 1721:'ohs15',
  1722:'ohss15', 1723:'ohs15', 1724:'ohm15', 1725:'ohm15', 1726:'ohm15', 1727:'ohss15',
  1728:'ohs15', 1729:'ycms15', 1730:'gcm15', 1731:'bcms15', 1732:'ycm15', 1733:'ycm15',
  1734:'ohm15', 1735:'ohm15', 1736:'ohm15', 1737:'ohm16', 1738:'ohm16', 1739:'ohm16',
  1740:'ohs16', 1741:'rhs16', 1742:'ohs16', 1743:'ohm16', 1744:'ohs16', 1745:'rhm16',
  1746:'ohs16', 1747:'ohm16', 1748:'gcl16', 1749:'ohm16', 1750:'ohm16', 1751:'ohm16',
  1752:'bhms16', 1753:'yhl16', 1754:'yhl16', 1755:'bhl16', 1756:'bhm16', 1757:'ghl16',
  1758:'rcs16', 1759:'gcm16', 1760:'ocm16', 1761:'ohl16', 1762:'ohs16', 1763:'ohm16',
  1764:'ocms17', 1765:'yhm17', 1766:'ohlp15', 1767:'ycl17', 1768:'yhl17', 1769:'ohlp15',
  1770:'yhl17', 1771:'ocm17', 1772:'ocm17', 1773:'rhs17', 1774:'ohm17', 1775:'ghm17',
  1776:'ohsp17', 1777:'ohsp17', 1778:'ohsp18', 1779:'ohsp18', 1780:'ghsp18', 1781:'ghsp18',
  1782:'rhmp18', 1783:'ghlp15', 1784:'ohsp18', 1785:'rhmp18', 1786:'bhm19', 1787:'bhs19',
  1788:'bcms19', 1789:'bcms19', 1790:'bhl19', 1791:'ohm15', 1792:'rhl15', 1793:'bhss20',
  1794:'bcms20', 1795:'ghl20', 1796:'ghm20', 1797:'ohs20', 1798:'ghs20', 1799:'bhms20'
};

const SHAPE = { b: 'beam', y: 'spray', r: 'ring', g: 'sigil', o: 'round' };
const MOTION = { e: 'expand', h: 'hold', c: 'contract' };
const SIZE = { s: 'small', m: 'mid', l: 'large' };

/** Unpack one effect's record. */
export function fxInfo(id) {
  const s = FX_EFFECTS[id];
  if (!s) return null;
  const m = /^(.)(.)(.)([sp]*)(\d+)$/.exec(s);
  if (!m) return null;
  return {
    id, shape: SHAPE[m[1]], motion: MOTION[m[2]], size: SIZE[m[3]],
    spins: m[4].includes('s'), persists: m[4].includes('p'),
    frames: parseInt(m[5], 10), file: `fx_${id}.png`,
  };
}

/** family -> the effects whose measured geometry can honestly play it. */
export const FX_POOLS = {
  bloom: [774, 775, 776, 777, 920, 991, 992, 993, 994, 997, 1014, 1015, 1016, 1019, 1020, 1021, 1028, 1036, 1038, 1059, 1060, 1063, 1064, 1067, 1086, 1087, 1088, 1130, 1169, 1171, 1172, 1175, 1186, 1203, 1215, 1230, 1254, 1274, 1281, 1282, 1305, 1312, 1368, 1434, 1468, 1472, 1520, 1521, 1536, 1538, 1539, 1547, 1574, 1575, 1594, 1624, 1625, 1645, 1646, 1647, 1661, 1662, 1663, 1664, 1665, 1666, 1667, 1668, 1669, 1671, 1672, 1693, 1697, 1700, 1701, 1703, 1704, 1705, 1706, 1709, 1711, 1766, 1769, 1776, 1777, 1778, 1779, 1784],
  boltstrike: [764, 787, 816, 856, 857, 878, 880, 886, 936, 942, 957, 959, 995, 1017, 1082, 1131, 1154, 1200, 1218, 1221, 1232, 1250, 1252, 1263, 1292, 1311, 1316, 1340, 1362, 1380, 1392, 1435, 1511, 1556, 1596, 1613, 1628, 1631, 1635, 1637, 1642, 1660, 1731, 1789, 1790, 1794],
  bubble: [750, 1104, 1114, 1190, 1206, 1217, 1249, 1400, 1485, 1488, 1542, 1609, 1612, 1639, 1687, 1688, 1691, 1741, 1745, 1773, 1782, 1785, 1792],
  chainext: [784, 804, 808, 850, 858, 884, 934, 937, 941, 944, 960, 1026, 1035, 1065, 1069, 1089, 1115, 1118, 1119, 1120, 1136, 1138, 1139, 1141, 1155, 1177, 1179, 1183, 1185, 1187, 1191, 1210, 1222, 1223, 1224, 1255, 1256, 1257, 1300, 1306, 1308, 1337, 1342, 1350, 1365, 1374, 1394, 1399, 1431, 1483, 1502, 1525, 1633, 1634, 1644, 1677, 1678, 1707, 1755, 1756, 1786, 1787, 1788, 1799],
  cracks: [759, 760, 762, 775, 777, 868, 870, 871, 873, 875, 876, 919, 1010, 1064, 1067, 1072, 1073, 1084, 1092, 1100, 1101, 1201, 1214, 1235, 1303, 1305, 1336, 1363, 1364, 1438, 1440, 1441, 1498, 1518, 1527, 1541, 1545, 1552, 1554, 1559, 1560, 1561, 1562, 1563, 1564, 1565, 1570, 1580, 1590, 1595, 1614, 1618, 1619, 1620, 1621, 1622, 1623, 1624, 1625, 1631, 1675, 1714, 1716, 1718, 1753, 1754, 1756, 1765, 1768, 1770, 1790],
  dashstreak: [804, 808, 850, 884, 937, 941, 1035, 1065, 1089, 1115, 1118, 1120, 1129, 1136, 1138, 1139, 1141, 1177, 1210, 1222, 1223, 1224, 1255, 1256, 1257, 1308, 1337, 1342, 1394, 1399, 1483, 1634, 1644, 1677, 1698, 1755, 1756, 1786, 1799],
  explosion: [754, 755, 756, 757, 758, 763, 765, 772, 783, 785, 789, 792, 793, 794, 796, 797, 800, 812, 813, 814, 815, 818, 819, 820, 821, 826, 828, 831, 832, 833, 834, 835, 836, 838, 847, 848, 849, 851, 860, 861, 862, 863, 865, 866, 867, 902, 903, 904, 906, 909, 911, 914, 915, 925, 931, 958, 971, 974, 976, 977, 978, 979, 981, 982, 984, 989, 998, 1005, 1006, 1007, 1008, 1009, 1018, 1025, 1031, 1034, 1074, 1077, 1078, 1079, 1080, 1090, 1091, 1121, 1123, 1124, 1125, 1127, 1128, 1134, 1135, 1140, 1144, 1146, 1147, 1176, 1180, 1181, 1182, 1198, 1209, 1228, 1229, 1234, 1237, 1238, 1243, 1244, 1245, 1248, 1253, 1260, 1261, 1262, 1269, 1286, 1287, 1295, 1301, 1304, 1307, 1309, 1318, 1319, 1321, 1322, 1323, 1329, 1330, 1332, 1338, 1339, 1343, 1345, 1351, 1356, 1361, 1372, 1375, 1377, 1379, 1384, 1388, 1396, 1397, 1403, 1404, 1406, 1410, 1411, 1412, 1413, 1419, 1424, 1426, 1427, 1432, 1442, 1443, 1448, 1449, 1451, 1455, 1456, 1457, 1459, 1460, 1463, 1464, 1466, 1467, 1484, 1504, 1505, 1509, 1510, 1512, 1513, 1514, 1515, 1517, 1519, 1532, 1557, 1566, 1567, 1568, 1569, 1589, 1603, 1653],
  goldring: [750, 840, 841, 842, 846, 907, 908, 1095, 1104, 1114, 1145, 1190, 1206, 1217, 1249, 1294, 1315, 1320, 1346, 1347, 1354, 1366, 1389, 1400, 1447, 1485, 1488, 1499, 1534, 1542, 1582, 1609, 1612, 1639, 1687, 1688, 1691, 1741, 1745, 1758, 1773, 1782, 1785, 1792],
  impact: [751, 753, 767, 768, 778, 779, 780, 781, 786, 791, 799, 802, 806, 809, 810, 817, 822, 823, 824, 825, 827, 830, 837, 852, 864, 889, 905, 910, 913, 916, 917, 921, 922, 923, 924, 927, 930, 932, 939, 951, 953, 961, 962, 963, 965, 966, 969, 970, 972, 975, 980, 983, 985, 986, 987, 988, 990, 1000, 1012, 1013, 1027, 1054, 1075, 1076, 1081, 1083, 1097, 1098, 1102, 1108, 1133, 1151, 1153, 1162, 1189, 1192, 1194, 1196, 1197, 1207, 1208, 1216, 1219, 1220, 1239, 1240, 1264, 1270, 1271, 1288, 1291, 1296, 1297, 1298, 1327, 1355, 1357, 1359, 1369, 1371, 1373, 1376, 1378, 1381, 1382, 1383, 1385, 1391, 1405, 1407, 1409, 1415, 1422, 1428, 1429, 1430, 1433, 1439, 1445, 1446, 1450, 1452, 1453, 1454, 1458, 1462, 1473, 1475, 1476, 1477, 1478, 1479, 1480, 1481, 1482, 1487, 1491, 1493, 1496, 1497, 1506, 1522, 1524, 1528, 1533, 1535, 1537, 1540, 1543, 1544, 1546, 1548, 1549, 1550, 1551, 1553, 1555, 1571, 1572, 1573, 1576, 1577, 1578, 1579, 1586, 1587, 1588, 1591, 1592, 1597, 1598, 1599, 1600, 1601, 1602, 1604, 1606, 1607, 1615, 1616, 1617, 1638, 1640, 1641, 1643, 1648, 1649, 1650, 1652, 1655, 1656, 1657, 1673, 1674, 1676, 1679, 1680, 1681, 1682, 1683, 1684, 1685, 1686, 1689, 1690, 1708, 1710, 1713, 1717, 1719, 1721, 1722, 1723, 1724, 1725, 1726, 1727, 1728, 1734, 1735, 1736, 1737, 1738, 1739, 1740, 1742, 1743, 1744, 1746, 1747, 1749, 1750, 1751, 1761, 1762, 1763, 1774, 1791, 1797],
  leechspiral: [790, 854, 855, 856, 857, 858, 859, 879, 893, 894, 895, 896, 897, 898, 899, 900, 901, 1026, 1044, 1045, 1046, 1115, 1116, 1117, 1118, 1120, 1232, 1289, 1313, 1314, 1499, 1507, 1611, 1698, 1707, 1729, 1731, 1764, 1788, 1789, 1794],
  lightning: [759, 760, 761, 762, 773, 775, 777, 782, 803, 868, 869, 870, 871, 873, 875, 877, 882, 891, 892, 919, 935, 955, 1010, 1047, 1048, 1064, 1067, 1072, 1073, 1084, 1092, 1100, 1101, 1106, 1126, 1160, 1201, 1202, 1214, 1225, 1236, 1246, 1280, 1290, 1293, 1303, 1305, 1334, 1336, 1344, 1352, 1360, 1364, 1423, 1438, 1440, 1441, 1498, 1518, 1527, 1541, 1545, 1552, 1554, 1558, 1559, 1560, 1561, 1562, 1563, 1564, 1565, 1570, 1580, 1590, 1595, 1614, 1618, 1619, 1620, 1621, 1622, 1623, 1624, 1625, 1675, 1712, 1714, 1716, 1718, 1753, 1754, 1765, 1768, 1770],
  puff: [754, 755, 757, 765, 783, 785, 794, 814, 847, 902, 906, 911, 976, 977, 978, 981, 989, 1006, 1008, 1112, 1125, 1134, 1135, 1146, 1209, 1228, 1234, 1238, 1244, 1253, 1318, 1361, 1397, 1403, 1404, 1419, 1426, 1432, 1448, 1455, 1456, 1460, 1510, 1557, 1603],
  pulse: [907, 908, 1145, 1294, 1320, 1346, 1347, 1354, 1366, 1389, 1447, 1534],
  rain: [773, 782, 803, 869, 877, 882, 891, 892, 935, 1047, 1048, 1126, 1160, 1202, 1225, 1236, 1246, 1280, 1290, 1334, 1344, 1352, 1360, 1423, 1558, 1712],
  runecircle: [770, 788, 795, 801, 829, 883, 912, 918, 933, 973, 1003, 1011, 1022, 1023, 1024, 1037, 1093, 1096, 1113, 1132, 1137, 1148, 1149, 1150, 1152, 1161, 1163, 1164, 1166, 1167, 1168, 1170, 1173, 1204, 1205, 1211, 1226, 1227, 1241, 1242, 1251, 1259, 1265, 1266, 1267, 1268, 1275, 1276, 1283, 1284, 1285, 1324, 1331, 1333, 1341, 1348, 1367, 1370, 1386, 1387, 1395, 1398, 1401, 1402, 1417, 1418, 1420, 1421, 1425, 1437, 1486, 1651, 1659, 1670, 1692, 1699, 1720, 1757, 1775, 1780, 1781, 1783, 1796, 1798],
  sigil: [752, 770, 801, 881, 918, 933, 964, 973, 999, 1003, 1011, 1022, 1023, 1029, 1066, 1093, 1096, 1099, 1132, 1137, 1148, 1149, 1150, 1152, 1158, 1163, 1164, 1166, 1167, 1168, 1170, 1173, 1174, 1204, 1205, 1211, 1251, 1259, 1272, 1273, 1276, 1283, 1284, 1285, 1299, 1325, 1331, 1333, 1348, 1349, 1367, 1370, 1386, 1387, 1398, 1401, 1408, 1414, 1416, 1417, 1418, 1420, 1421, 1437, 1470, 1486, 1489, 1495, 1626, 1632, 1651, 1659, 1670, 1692, 1694, 1695, 1699, 1720, 1757, 1775, 1780, 1781, 1783, 1795, 1796, 1798],
  slash: [764, 784, 787, 804, 808, 816, 850, 856, 857, 858, 876, 878, 880, 884, 885, 886, 887, 888, 890, 893, 895, 898, 900, 901, 926, 928, 934, 936, 937, 941, 942, 944, 948, 950, 956, 957, 959, 960, 995, 996, 1001, 1002, 1004, 1017, 1026, 1030, 1035, 1046, 1049, 1065, 1068, 1069, 1082, 1085, 1089, 1110, 1115, 1116, 1117, 1118, 1119, 1120, 1129, 1131, 1136, 1138, 1139, 1141, 1143, 1154, 1155, 1159, 1177, 1179, 1183, 1185, 1187, 1188, 1191, 1193, 1195, 1200, 1210, 1218, 1221, 1222, 1223, 1224, 1232, 1235, 1247, 1250, 1252, 1255, 1256, 1257, 1263, 1292, 1300, 1306, 1308, 1310, 1311, 1316, 1317, 1326, 1328, 1337, 1340, 1342, 1350, 1358, 1362, 1363, 1365, 1374, 1380, 1390, 1392, 1394, 1399, 1431, 1435, 1436, 1444, 1461, 1465, 1469, 1471, 1474, 1483, 1500, 1501, 1502, 1503, 1507, 1511, 1516, 1525, 1526, 1529, 1530, 1531, 1556, 1596, 1613, 1628, 1631, 1633, 1634, 1635, 1637, 1642, 1644, 1654, 1660, 1677, 1678, 1698, 1707, 1731, 1752, 1755, 1756, 1786, 1787, 1788, 1789, 1790, 1793, 1794, 1799],
  summonring: [788, 795, 829, 853, 883, 907, 908, 912, 1024, 1037, 1113, 1145, 1161, 1178, 1226, 1227, 1241, 1242, 1265, 1266, 1267, 1268, 1275, 1279, 1294, 1320, 1324, 1341, 1346, 1347, 1353, 1354, 1366, 1389, 1395, 1402, 1425, 1447, 1534],
  thornshield: [759, 760, 762, 775, 777, 868, 870, 871, 873, 875, 919, 1010, 1011, 1064, 1066, 1067, 1072, 1073, 1084, 1092, 1100, 1101, 1132, 1137, 1150, 1164, 1201, 1214, 1276, 1284, 1303, 1305, 1336, 1364, 1438, 1440, 1441, 1498, 1518, 1527, 1541, 1545, 1552, 1554, 1559, 1560, 1561, 1562, 1563, 1564, 1565, 1570, 1580, 1590, 1595, 1614, 1618, 1619, 1620, 1621, 1622, 1623, 1624, 1625, 1626, 1675, 1714, 1716, 1718, 1753, 1754, 1757, 1765, 1768, 1770],
  voidburst: [766, 769, 771, 790, 798, 804, 805, 807, 808, 811, 839, 840, 841, 842, 843, 844, 845, 846, 854, 855, 856, 857, 858, 859, 872, 874, 879, 893, 894, 895, 896, 897, 898, 899, 900, 901, 929, 934, 938, 940, 943, 944, 945, 946, 947, 948, 949, 952, 954, 957, 960, 967, 968, 1026, 1030, 1039, 1040, 1041, 1042, 1043, 1044, 1045, 1046, 1050, 1051, 1052, 1053, 1055, 1056, 1057, 1058, 1061, 1062, 1070, 1071, 1094, 1095, 1103, 1105, 1107, 1109, 1111, 1115, 1116, 1117, 1118, 1120, 1122, 1142, 1156, 1157, 1165, 1183, 1184, 1199, 1212, 1213, 1231, 1232, 1233, 1258, 1277, 1278, 1289, 1302, 1313, 1314, 1315, 1335, 1393, 1444, 1490, 1492, 1494, 1499, 1507, 1508, 1523, 1581, 1582, 1583, 1584, 1585, 1593, 1605, 1608, 1610, 1611, 1627, 1628, 1629, 1630, 1636, 1644, 1658, 1696, 1698, 1702, 1707, 1715, 1729, 1730, 1731, 1732, 1733, 1748, 1758, 1759, 1760, 1764, 1767, 1771, 1772, 1788, 1789, 1794],
};

export const FX_FAMILY_KEYS = Object.keys(FX_POOLS);

/** A monster's attack, by family. Family wins over element, exactly as in
 *  monsterDebuffs.js, so a hellhound stays fiery whatever its variant. */
export const MONSTER_FAMILY_FX = {
  'hellhound': 'explosion',
  'dragon': 'explosion',
  'elemental': 'lightning',
  'hydra': 'rain',
  'spider': 'chainext',
  'lizard': 'slash',
  'skeleton': 'slash',
  'bat': 'leechspiral',
  'chimera': 'slash',
  'slimeGolem': 'impact',
  'shade': 'voidburst',
  'demon': 'sigil',
  'wolf': 'slash',
  'raptor': 'slash',
  'boar': 'impact',
  'trex': 'slash',
  'spinosaurus': 'slash',
  'slime': 'impact',

  // ROUND 75 -- the thirteen new families. Every one gets its OWN entry rather
  // than falling through to the element map, which is what test_round61
  // asserts and it is right to: the element fallback answers "physical" for
  // almost all of these, and a scorpion's sting, a cobra's strike and a
  // minotaur's charge would all land as the same grey impact puff.
  //
  // Chosen by what the creature actually DOES, not by what it is:
  'scorpion': 'sigil',          // a venomous sting, not a blunt hit
  'cobra': 'sigil',             // the same, and the fangs are the point
  'medusa': 'voidburst',        // a gaze, and she is the roster's caster
  'mantis': 'slash',            // serrated forelimbs, two of them
  'crocodile': 'slash',         // the bite is the whole animal
  'whitelion': 'slash',         // claws
  'direbuck': 'impact',         // a goring charge
  'hornram': 'impact',          // the roster's purest charge
  'minotaur': 'impact',         // a bull and an axe
  'yeti': 'impact',             // enormous and blunt
  'giantToad': 'chainext',      // the tongue, which is a thing that reaches
  'phoenix': 'explosion',       // it is on fire
  'thunderbird': 'lightning',   // it is the storm

  // ROUND 173 -- the eight new families, on the same rule round 75 set down.
  // `test_round61` billed all eight the moment they joined the roster, which
  // is the check doing exactly its job: without an entry each falls through to
  // the element map, which answers 'physical' for six of the eight, so a
  // gnoll's bite, an ape's fist and a troll's swing would all land as the same
  // grey puff.
  //
  // Chosen by what the creature DOES, not by what it is:
  'quillFiend': 'chainext',     // a volley of quills -- a thing that reaches
  'gnoll': 'slash',             // teeth, and a crude blade
  'spiritSerpent': 'voidburst', // spirit-spit; it is barely here
  'steelRaptor': 'lightning',   // spines off a machine
  'shellborn': 'impact',        // mineral, swinging a mineral arm
  'harbinger': 'sigil',         // a caster, and the name is the effect
  'sixArmApe': 'impact',        // six of them, all blunt
  'tidalTroll': 'rain',         // it comes up out of the water

  // ROUND 200 -- the five new families, and the same rule round 75 wrote above
  // applies: each gets its OWN entry rather than falling through to the
  // element map, because that map answers "physical" for almost all of these
  // and a glass cat's shattering leap and a demon sloth's swipe would land as
  // the same grey impact puff.
  //
  // Chosen by what the creature does, and two of them are not physical at all
  // (see MONSTER_FAMILY_BASE: the hydra and the angel are `magical`).
  'glasscat': 'cracks',         // a thing made of glass, going through you
  'sharkcrab': 'slash',         // the claws are the whole animal
  'flowerhydra': 'bloom',       // five heads and a spray of pollen
  'bloomimp': 'bloom',          // ROUND 285 -- petals and pollen
  'snapmaw': 'slash',           // ROUND 285 -- two mouths; the bite is the whole plant
  'vinegrasp': 'slash',         // ROUND 285 -- hooks and blades
  'birdangel': 'boltstrike',    // it is magical and it comes down from above
  'demonsloth': 'impact'        // enormous, slow, and it lands like a wall
};

/** ...and the fallback for a family with no entry of its own. */
export const MONSTER_ELEMENT_FX = {
  'fire': 'explosion',
  'frost': 'rain',
  'lightning': 'lightning',
  'nature': 'thornshield',
  'shadow': 'voidburst',
  'radiant': 'runecircle',
  'physical': 'impact'
};

/** What a landing debuff looks like, by the kind debuffs.js already assigns. */
export const DEBUFF_KIND_FX = {
  'affliction': 'sigil',
  'control': 'voidburst',
  'rate': 'runecircle',
  'attribute': 'sigil',
  'amplify': 'pulse'
};

/** Deterministic pick from a family's pool.
 *
 *  Seeded off the ability's own identity rather than Math.random, so an
 *  ability casts the same way every time it is used and across reloads -- the
 *  same rule the whole generator runs on. Two abilities in one family land on
 *  different effects because their seeds differ, which is the entire point of
 *  having pools.
 */
export function pickFxEffect(family, seed) {
  const pool = FX_POOLS[family] || FX_POOLS.impact;
  if (!pool || !pool.length) return null;
  const s = String(seed == null ? '' : seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return pool[Math.abs(h) % pool.length];
}

/** The same pick, biased toward effects of a given size -- so a heavy ability
 *  gets a big effect and a jab gets a small one. Falls back to the whole pool
 *  when the family has nothing at that size. */
export function pickFxEffectSized(family, seed, size) {
  const pool = FX_POOLS[family] || FX_POOLS.impact;
  if (!pool || !pool.length) return null;
  const want = pool.filter((id) => {
    const i = fxInfo(id);
    return i && i.size === size;
  });
  // The size filter must not collapse the pool: `bubble` has 23 effects but
  // only 4 measured small, so a run of small wards drew from four shapes and
  // looked repetitive. Round 60's suite caught it at 4 distinct from 40 wards.
  // Six is the floor at which preferring the subset is worth it.
  //
  // ROUND 61 -- this lives HERE, in the emitter, because fxLibrary.js is
  // generated. The round-60 fix was hand-edited into the output and was
  // silently reverted the next time the file was regenerated; the regression
  // suite is what noticed.
  const use = want.length >= 6 ? want : pool;
  const s = String(seed == null ? '' : seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return use[Math.abs(h) % use.length];
}

/** Which effect a monster's attack uses. */
export function monsterFx(family, element, seed) {
  const fam = MONSTER_FAMILY_FX[family]
    || MONSTER_ELEMENT_FX[element || 'physical']
    || 'impact';
  return { family: fam, id: pickFxEffect(fam, seed) };
}

/** Which effect a debuff shows when it lands. */
export function debuffFx(kind, seed) {
  const fam = DEBUFF_KIND_FX[kind] || 'sigil';
  return { family: fam, id: pickFxEffect(fam, seed) };
}
