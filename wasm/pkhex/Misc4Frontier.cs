// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
using static System.Buffers.Binary.BinaryPrimitives;
namespace PokeRNGKit.SaveEditor;
internal static partial class Misc4Editing
{
    private static readonly int[][] DpFrontier=[[0,1,0x5FCA,4,0x6601]];
    private static readonly int[][] PtFrontier=[[0,1,0x68E0,4,0x723D],[1,0,0x68F4,16,0x7EF8],[0,0,0x6924,24,0x7EFC],[2,0,0x696C,16,0x7F00],[0,0,0x699C,4,0x7F04]];
    private static readonly int[][] HgFrontier=[[0,1,0x5264,4,0x5BC1],[1,0,0x5278,16,0x687C],[0,0,0x52A8,24,0x6880],[2,0,0x52F0,16,0x6884],[0,0,0x5320,4,0x6888]];
    private static readonly string[][] StatFields=[["max","current"],["max","current","maxTrade","currentTrade"],["max","current","currentCP","skip","maxCP"]];
    private static readonly int[] TypeOrder=[0,9,10,12,11,14,1,3,4,2,13,6,5,7,15,16,8];
    private static readonly LocalizedText[] Facilities=[Text("对战塔","Battle Tower","バトルタワー"),Text("对战工厂","Battle Factory","バトルファクトリー"),Text("对战舞台","Battle Hall","バトルステージ"),Text("对战城堡","Battle Castle","バトルキャッスル"),Text("对战轮盘","Battle Arcade","バトルルーレット")];
    private static readonly LocalizedText[] Modes=[Text("单打","Singles","シングル"),Text("双打","Doubles","ダブル"),Text("多人","Multi","マルチ"),Text("多人（朋友）","Multi (Friend)","マルチ（友達）"),Text("Wi-Fi","Wi-Fi","Wi-Fi")];
    private static LocalizedText StatName(string key)=>key switch{"max"=>Text("记录","Record","記録"),"current"=>Text("当前","Current","現在"),"maxTrade"=>Text("交换记录","Trade record","交換の記録"),"currentTrade"=>Text("当前交换","Current trade","現在の交換"),"currentCP"=>Text("当前 CP","Current CP","現在のCP"),"maxCP"=>Text("CP 记录","CP record","CPの記録"),"resume"=>Text("继续","Continue","続ける"),"continueCount"=>Text("继续次数","Continue count","続行回数"),_=>throw new ArgumentException("Invalid Misc4 statistic.")};
    private static Misc4Group FrontierGroup(string id)
    {
        if(id=="prints")return new(id,Text("开拓区印章","Frontier prints","フロンティアのシンボル"));var p=id.Split('.');if(p[0]=="hall"){var mode=Modes[int.Parse(p[1])];return new(id,Text($"舞台种类记录 · {mode.Zh}",$"Hall species records · {mode.En}",$"ステージの種類別記録 · {mode.Ja}"));}
        int f=int.Parse(p[1]),b=int.Parse(p[2]),level=int.Parse(p[3]);var facility=Facilities[f];var type=f==0&&b==2?Text("多人（训练家）","Multi (Trainer)","マルチ（トレーナー）"):Modes[b];string z=f==1?(level==0?" · Lv. 50":" · 开放等级"):"",e=f==1?(level==0?" · Lv. 50":" · Open"):"",j=f==1?(level==0?" · Lv. 50":" · オープン"):"";return new(id,Text($"{facility.Zh} · {type.Zh}{z}",$"{facility.En} · {type.En}{e}",$"{facility.Ja} · {type.Ja}{j}"));
    }
    private static Hall4? Hall(SAV4 s)=>s is SAV4DP||s.Data.Length<0x80000?null:s.GetHall();
    private static void AddFrontier(SAV4 s,List<Misc4Def> d)
    {
        var layout=s is SAV4DP?DpFrontier:s is SAV4Pt?PtFrontier:HgFrontier;
        for(int f=0;f<layout.Length;f++)for(int b=0;b<(f==0?5:3);b++)for(int level=0;level<(f==1?2:1);level++)
        {
            int facility=f,battle=b;var info=layout[f];int address=info[2]+info[3]*b+(level<<3),flag=info[4],mask=1<<(b+(level<<2));string group=$"bf.{f}.{b}.{level}";
            var fields=StatFields[info[0]];for(int n=0;n<fields.Length;n++){int at=address+2*n;string field=fields[n];if(field=="skip")continue;Add(d,$"{group}.{field}",group,StatName(field),ReadUInt16LittleEndian(s.General[at..]),9999,(x,v)=>{if(facility==0&&field=="current")TowerValue(x,address,flag+(x is SAV4DP?3:1)+(battle<<1),0,(int)v);else WriteUInt16LittleEndian(x.General[at..],(ushort)v);});}
            Add(d,$"{group}.resume",group,StatName("resume"),(s.General[flag]&mask)!=0?1:0,1,(x,v)=>{x.General[flag]=(byte)(v!=0?x.General[flag]|mask:x.General[flag]&~mask);if(v!=0&&facility==3)x.General[flag+1]|=1;});
            if(f==0){int at=flag+(s is SAV4DP?3:1)+(b<<1);Add(d,$"{group}.continueCount",group,StatName("continueCount"),ReadUInt16LittleEndian(s.General[at..]),65535,(x,v)=>TowerValue(x,address,at,1,(int)v));}
            if(f==3){for(int rank=0;rank<3;rank++){int at=address+10+rank*2;var name=rank==0?Text("回复等级","Recovery rank","回復ランク"):rank==1?Text("道具等级","Item rank","道具ランク"):Text("信息等级","Information rank","情報ランク");Add(d,$"{group}.rank.{rank}",group,name,ReadInt16LittleEndian(s.General[at..]),rank==2?2:3,(x,v)=>WriteInt16LittleEndian(x.General[at..],(short)v),1);}}
            if(f==2)
            {
                int speciesAt=address+4,current=ReadUInt16LittleEndian(s.General[speciesAt..]);OriginChoice[] choices=Enumerable.Range(0,s.MaxSpeciesID+1).Select(id=>new OriginChoice(id,Resource(t=>t.specieslist,id))).ToArray();Add(d,$"{group}.species",group,Text("当前种类","Current species","現在の種類"),current,s.MaxSpeciesID,(x,v)=>WriteUInt16LittleEndian(x.General[speciesAt..],(ushort)v),choices:choices);
                for(int i=0;i<17;i++){int at=address+6+((i>>1)<<1),shift=(i&1)<<2;Add(d,$"{group}.type.{i}",group,Resource(t=>t.types,TypeOrder[i]),s.General[at]>>shift&15,10,(x,v)=>x.General[at]=(byte)((x.General[at]&~(15<<shift))|((int)v<<shift)),writable:current>=1&&current<=s.MaxSpeciesID);}
            }
        }
        if(s is SAV4DP)return;int printStart=s is SAV4Pt?79:77;OriginChoice[] prints=[new(0,Text("未获得","None","未獲得")),new(1,Text("银色待领取","Silver ready","銀・受取前")),new(2,Text("银色已领取","Silver received","銀・受取済み")),new(3,Text("金色待领取","Gold ready","金・受取前")),new(4,Text("金色已领取","Gold received","金・受取済み"))];for(int i=0;i<5;i++){int index=printStart+i;Add(d,$"print.{i}","prints",Facilities[i],s.GetWork(index),4,(x,v)=>x.SetWork(index,(ushort)v),choices:prints);}
        var hall=Hall(s);if(hall is not {IsValid:true})return;for(int b=0;b<3;b++)for(int species=1;species<=s.MaxSpeciesID;species++){int battle=b;ushort id=(ushort)species;string group=$"hall.{b}";Add(d,$"{group}.{id}",group,Resource(t=>t.specieslist,id),hall.GetCount(b,id),9999,(x,v)=>{var h=Hall(x)??throw new ArgumentException("Misc4 Hall block is unavailable.");h.SetCount(battle,id,(ushort)v);h.RefreshChecksum();});}
    }
    // Reproduce the window's ValueChanged sequence; rounding depends on the other control's starting value.
    private static void TowerValue(SAV4 s,int address,int countAt,int changed,int value)
    {
        int current=Math.Min(9999,(int)ReadUInt16LittleEndian(s.General[(address+2)..])),count=ReadUInt16LittleEndian(s.General[countAt..]);
        for(int step=0;step<12;step++)
        {
            if(changed==0){current=value;WriteUInt16LittleEndian(s.General[(address+2)..],(ushort)value);}else{count=value;WriteUInt16LittleEndian(s.General[countAt..],(ushort)value);}
            if(current/7==count)return;
            if(changed==0){value=current/7;if(value==count)return;changed=1;}
            else{int next=9999>count*7?count*7:current<9999?9999:current;if(next==current)return;value=next;changed=0;}
        }
        throw new InvalidOperationException("Misc4 tower counters did not converge.");
    }
}
