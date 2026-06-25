export interface CountyInfo {
  name: string;
  lat: number;
  lng: number;
  aliases: string[];
}

export const TAIWAN_COUNTIES: CountyInfo[] = [
  { name: '台北市', lat: 25.0330, lng: 121.5654, aliases: ['臺北市', '台北', '臺北'] },
  { name: '新北市', lat: 25.0120, lng: 121.4652, aliases: ['新北', '台北縣'] },
  { name: '基隆市', lat: 25.1283, lng: 121.7419, aliases: ['基隆'] },
  { name: '桃園市', lat: 24.9936, lng: 121.3010, aliases: ['桃園縣', '桃園', '臺桃園市'] },
  { name: '新竹市', lat: 24.8066, lng: 120.9686, aliases: ['新竹'] },
  { name: '新竹縣', lat: 24.8387, lng: 121.0177, aliases: [] },
  { name: '苗栗縣', lat: 24.5602, lng: 120.8214, aliases: ['苗栗'] },
  { name: '台中市', lat: 24.1477, lng: 120.6736, aliases: ['臺中市', '台中', '臺中'] },
  { name: '彰化縣', lat: 24.0518, lng: 120.5161, aliases: ['彰化'] },
  { name: '南投縣', lat: 23.9609, lng: 120.9718, aliases: ['南投'] },
  { name: '雲林縣', lat: 23.7092, lng: 120.4313, aliases: ['雲林'] },
  { name: '嘉義市', lat: 23.4801, lng: 120.4491, aliases: ['嘉義'] },
  { name: '嘉義縣', lat: 23.4518, lng: 120.2554, aliases: [] },
  { name: '台南市', lat: 22.9998, lng: 120.2270, aliases: ['臺南市', '台南', '臺南'] },
  { name: '高雄市', lat: 22.6273, lng: 120.3014, aliases: ['高雄'] },
  { name: '屏東縣', lat: 22.5519, lng: 120.5487, aliases: ['屏東'] },
  { name: '宜蘭縣', lat: 24.7021, lng: 121.7378, aliases: ['宜蘭'] },
  { name: '花蓮縣', lat: 23.9871, lng: 121.6014, aliases: ['花蓮'] },
  { name: '台東縣', lat: 22.7583, lng: 121.1444, aliases: ['臺東縣', '台東', '臺東'] },
  { name: '澎湖縣', lat: 23.5711, lng: 119.5794, aliases: ['澎湖'] },
  { name: '金門縣', lat: 24.4493, lng: 118.3767, aliases: ['金門'] },
  { name: '連江縣', lat: 26.1500, lng: 119.9300, aliases: ['馬祖', '連江'] },
];

export function findCounty(name: string): CountyInfo | undefined {
  const normalized = name.trim();
  // Priority 1: exact county name match or normalized starts with full county name
  const byName = TAIWAN_COUNTIES.find(
    (c) => c.name === normalized || normalized.startsWith(c.name),
  );
  if (byName) return byName;

  // Priority 2: exact alias match
  const byAlias = TAIWAN_COUNTIES.find((c) => c.aliases.includes(normalized));
  if (byAlias) return byAlias;

  // Priority 3: loose matching for search input (short strings like "嘉義")
  return TAIWAN_COUNTIES.find(
    (c) =>
      c.name.startsWith(normalized) ||
      c.aliases.some((a) => normalized.startsWith(a) || a.startsWith(normalized)),
  );
}
