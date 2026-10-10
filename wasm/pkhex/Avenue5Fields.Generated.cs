// SPDX-License-Identifier: GPL-3.0-or-later
using PKHeX.Core;
namespace PokeRNGKit.SaveEditor;
internal static partial class Avenue5Fields
{
 internal static void Common(IJoinAvenueEntity5 entity,List<Avenue5Definition> fields,SAV5B2W2 save){
 void N(string id,LocalizedText name,long max,Func<long> get,Action<long> set,bool boolean=false)=>fields.Add(Avenue5Definition.Number(id,"general",name,max,get,set,boolean));
 void T(string id,LocalizedText name,int max,Func<string> get,Action<string> set)=>fields.Add(Avenue5Definition.Text(id,"general",name,max,get,set));
 T("Name",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_Name"),7,()=>entity.Name,v=>entity.Name=v);
N("Country",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_Country"),255,()=>entity.Country,v=>entity.Country=(byte)v,false);
N("Subregion",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_Subregion"),255,()=>entity.Subregion,v=>entity.Subregion=(byte)v,false);
T("Shout",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_Shout"),8,()=>entity.Shout,v=>entity.Shout=v);
N("Unknown22",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_Unknown22"),15,()=>entity.Unknown22,v=>entity.Unknown22=(byte)v,false);
N("Unused23",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_Unused23"),255,()=>entity.Unused23,v=>entity.Unused23=(byte)v,false);
N("TID16",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_TID16"),65535,()=>entity.TID16,v=>entity.TID16=(ushort)v,false);
N("Unknown26",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_Unknown26"),255,()=>entity.Unknown26,v=>entity.Unknown26=(byte)v,false);
N("Unknown27",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_Unknown27"),255,()=>entity.Unknown27,v=>entity.Unknown27=(byte)v,false);
N("PlayedHours",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_PlayedHours"),1023,()=>entity.PlayedHours,v=>entity.PlayedHours=(ushort)v,false);
N("PlayedMinutes",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_PlayedMinutes"),63,()=>entity.PlayedMinutes,v=>entity.PlayedMinutes=(byte)v,false);
N("Sprite",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_Sprite"),65535,()=>entity.Sprite,v=>entity.Sprite=(ushort)v,false);
T("Greeting",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_Greeting"),8,()=>entity.Greeting,v=>entity.Greeting=v);
T("Farewell",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_Farewell"),8,()=>entity.Farewell,v=>entity.Farewell=v);
N("MetYear",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_MetYear"),255,()=>entity.MetYear,v=>entity.MetYear=(byte)v,false);
N("MetMonth",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_MetMonth"),255,()=>entity.MetMonth,v=>entity.MetMonth=(byte)v,false);
N("MetDay",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_MetDay"),255,()=>entity.MetDay,v=>entity.MetDay=(byte)v,false);
N("Seed",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_Seed"),4294967295,()=>entity.Seed,v=>entity.Seed=(uint)v,false);
 // Insert language-dependent candidates in their original save order.
 var version=NumberChoice("Version",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_Version"),()=>entity.Version,v=>entity.Version=(byte)v,Games(save));
 var language=NumberChoice("Language",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_Language"),()=>entity.Language,v=>entity.Language=(byte)v,Languages());
 var gender=NumberChoice("Gender",Avenue5Text.Get("JoinAvenueEntityGeneralEditor.L_Gender"),()=>entity.Gender,v=>entity.Gender=(byte)v,entity.Gender<2?[new(0,new("♂","♂","♂")),new(1,new("♀","♀","♀"))]:[new(2,new("-","-","-"))]);
 fields.Insert(fields.FindIndex(d=>d.Id=="Unknown22"),version);fields.Insert(fields.FindIndex(d=>d.Id=="Unknown22"),language);fields.Insert(fields.FindIndex(d=>d.Id=="Unused23"),gender);
 }
 internal static void Specific(IJoinAvenueEntity5 entity,List<Avenue5Definition> fields,SAV5B2W2 save){
 void N(string id,LocalizedText name,long max,Func<long> get,Action<long> set,bool boolean=false)=>fields.Add(Avenue5Definition.Number(id,"specific",name,max,get,set,boolean));
 if(entity is JoinAvenueVisitor5 visitor){N("IsFlag2C",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_IsFlag2C"),1,()=>visitor.IsFlag2C?1:0,v=>visitor.IsFlag2C=v==1,true);
N("JoinAvenueLevel",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_AvenueLevel"),127,()=>visitor.JoinAvenueLevel,v=>visitor.JoinAvenueLevel=(byte)v,false);
N("Unused2D",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_Unused2D"),255,()=>visitor.Unused2D,v=>visitor.Unused2D=(byte)v,false);
N("DexSeen",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_DexSeen"),1023,()=>visitor.DexSeen,v=>visitor.DexSeen=(ushort)v,false);
N("MedalRank",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_MedalRank"),255,()=>visitor.MedalRank,v=>visitor.MedalRank=(byte)v,false);
N("MedalHint",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_MedalHint"),255,()=>visitor.MedalHint,v=>visitor.MedalHint=(byte)v,false);
N("MedalCount",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_MedalCount"),255,()=>visitor.MedalCount,v=>visitor.MedalCount=(byte)v,false);
N("MetHour",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_MetHour"),255,()=>visitor.MetHour,v=>visitor.MetHour=(byte)v,false);
N("MetMinute",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_MetMinute"),255,()=>visitor.MetMinute,v=>visitor.MetMinute=(byte)v,false);
N("UnknownA8",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_UnknownA8"),255,()=>visitor.UnknownA8,v=>visitor.UnknownA8=(byte)v,false);
N("IsShopChangeAllowed",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_IsShopChangeAllowed"),1,()=>visitor.IsShopChangeAllowed?1:0,v=>visitor.IsShopChangeAllowed=v==1,true);
N("IsFlagA9_1",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_IsFlagA9_1"),1,()=>visitor.IsFlagA9_1?1:0,v=>visitor.IsFlagA9_1=v==1,true);
N("IsFlagA9_2",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_IsFlagA9_2"),1,()=>visitor.IsFlagA9_2?1:0,v=>visitor.IsFlagA9_2=v==1,true);
N("IsInteractedToday",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_InteractedToday"),1,()=>visitor.IsInteractedToday?1:0,v=>visitor.IsInteractedToday=v==1,true);
N("IsFlagAA",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_IsFlagAA"),1,()=>visitor.IsFlagAA?1:0,v=>visitor.IsFlagAA=v==1,true);
N("JoinAvenueRank",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_JoinAvenueRank"),255,()=>visitor.JoinAvenueRank,v=>visitor.JoinAvenueRank=(byte)v,false);
N("UnknownAC",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_UnknownAC"),255,()=>visitor.UnknownAC,v=>visitor.UnknownAC=(byte)v,false);
N("ShopRank",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_ShopRank"),10,()=>visitor.ShopRank,v=>visitor.ShopRank=(byte)v,false);
N("ShopExperience",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_ShopExperience"),65535,()=>visitor.ShopExperience,v=>visitor.ShopExperience=(ushort)v,false);
N("IsInventory",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_IsInventory"),4294967295,()=>visitor.IsInventory,v=>visitor.IsInventory=(uint)v,false);
N("ShopWork",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_ShopWork"),65535,()=>visitor.ShopWork,v=>visitor.ShopWork=(ushort)v,false);
N("UnusedB8",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_UnusedB8"),4294967295,()=>visitor.UnusedB8,v=>visitor.UnusedB8=(uint)v,false);
N("UnknownBits0_8",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_UnknownBits0_8"),511,()=>visitor.UnknownBits0_8,v=>visitor.UnknownBits0_8=(ushort)v,false);
N("IsUnknownBits9",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_UnknownBit9"),1,()=>visitor.IsUnknownBits9?1:0,v=>visitor.IsUnknownBits9=v==1,true);
N("UnknownBits10",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_UnknownBits10"),7,()=>visitor.UnknownBits10,v=>visitor.UnknownBits10=(byte)v,false);
N("UnknownBits13_20",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_UnknownBits13_20"),255,()=>visitor.UnknownBits13_20,v=>visitor.UnknownBits13_20=(byte)v,false);
N("UnknownBits21_27",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_UnknownBits21_27"),127,()=>visitor.UnknownBits21_27,v=>visitor.UnknownBits21_27=(byte)v,false);
N("UnknownBits28_31",Avenue5Text.Get("JoinAvenueVisitorSpecificEditor.L_UnknownBits28_31"),15,()=>visitor.UnknownBits28_31,v=>visitor.UnknownBits28_31=(byte)v,false);
 AddVisitorExtra(visitor,fields,save);
 }else if(entity is JoinAvenueFan5 fan){N("Unknown4C",Avenue5Text.Get("JoinAvenueFanSpecificEditor.L_Unknown4C"),255,()=>fan.Unknown4C,v=>fan.Unknown4C=(byte)v,false);
N("Unknown4D",Avenue5Text.Get("JoinAvenueFanSpecificEditor.L_Unknown4D"),255,()=>fan.Unknown4D,v=>fan.Unknown4D=(byte)v,false);
N("Unknown4F",Avenue5Text.Get("JoinAvenueFanSpecificEditor.L_Unknown4E"),255,()=>fan.Unknown4F,v=>fan.Unknown4F=(byte)v,false);
N("IsInteractedToday",Avenue5Text.Get("JoinAvenueFanSpecificEditor.L_InteractedToday"),1,()=>fan.IsInteractedToday?1:0,v=>fan.IsInteractedToday=v==1,true);
N("Unknown52",Avenue5Text.Get("JoinAvenueFanSpecificEditor.L_Unknown52"),65535,()=>fan.Unknown52,v=>fan.Unknown52=(ushort)v,false);
N("Unknown54",Avenue5Text.Get("JoinAvenueFanSpecificEditor.L_Unknown54"),255,()=>fan.Unknown54,v=>fan.Unknown54=(byte)v,false);
N("BubbleTarget",Avenue5Text.Get("JoinAvenueFanSpecificEditor.L_BubbleTarget"),255,()=>fan.BubbleTarget,v=>fan.BubbleTarget=(byte)v,false);
N("Unknown56",Avenue5Text.Get("JoinAvenueFanSpecificEditor.L_Unknown56"),255,()=>fan.Unknown56,v=>fan.Unknown56=(byte)v,false);
N("Unknown5A",Avenue5Text.Get("JoinAvenueFanSpecificEditor.L_Unknown5A"),65535,()=>fan.Unknown5A,v=>fan.Unknown5A=(ushort)v,false);
 fields.Insert(fields.FindIndex(d=>d.Id=="Unknown52"),NumberChoice("Species",Avenue5Text.Get("JoinAvenueFanSpecificEditor.L_Species"),()=>fan.Species,v=>fan.Species=(ushort)v,Species(save)) with{Group="specific"});
 }else if(entity is JoinAvenueAssistant5 assistant){N("Position0",Avenue5Text.Get("JoinAvenueAssistantSpecificEditor.L_Position0"),255,()=>assistant.Position0,v=>assistant.Position0=(byte)v,false);
N("Position1",Avenue5Text.Get("JoinAvenueAssistantSpecificEditor.L_Position1"),255,()=>assistant.Position1,v=>assistant.Position1=(byte)v,false);
N("Position2",Avenue5Text.Get("JoinAvenueAssistantSpecificEditor.L_Position2"),255,()=>assistant.Position2,v=>assistant.Position2=(byte)v,false);
N("PositionUnused",Avenue5Text.Get("JoinAvenueAssistantSpecificEditor.L_UnusedPosition"),255,()=>assistant.PositionUnused,v=>assistant.PositionUnused=(byte)v,false);
N("IsInteractedToday",Avenue5Text.Get("JoinAvenueAssistantSpecificEditor.L_InteractedToday"),1,()=>assistant.IsInteractedToday?1:0,v=>assistant.IsInteractedToday=v==1,true);}
 }
 internal static List<Avenue5Definition> Settings(SAV5B2W2 save){var settings=save.JoinAvenue.Settings;var fields=new List<Avenue5Definition>();
 void N(string id,LocalizedText name,long max,Func<long> get,Action<long> set,bool boolean=false)=>fields.Add(Avenue5Definition.Number(id,"settings",name,max,get,set,boolean));
 void T(string id,LocalizedText name,int max,Func<string> get,Action<string> set)=>fields.Add(Avenue5Definition.Text(id,"settings",name,max,get,set));
 T("Name",Avenue5Text.Get("JoinAvenueSettingsEditor.L_Name"),20,()=>settings.Name,v=>settings.Name=v);
T("PlayerTitle",Avenue5Text.Get("JoinAvenueSettingsEditor.L_Title"),20,()=>settings.PlayerTitle,v=>settings.PlayerTitle=v);
N("Experience",Avenue5Text.Get("JoinAvenueSettingsEditor.L_Experience"),4294967295,()=>settings.Experience,v=>settings.Experience=(uint)v,false);
N("Rank",Avenue5Text.Get("JoinAvenueSettingsEditor.L_Rank"),9999,()=>settings.Rank,v=>settings.Rank=(ushort)v,false);
N("Flags",Avenue5Text.Get("JoinAvenueSettingsEditor.L_Flags"),4294967295,()=>settings.Flags,v=>settings.Flags=(uint)v,false);
N("VisitingPlayerDatabaseCount",Avenue5Text.Get("JoinAvenueSettingsEditor.L_PlayerIDCount"),32,()=>settings.VisitingPlayerDatabaseCount,v=>settings.VisitingPlayerDatabaseCount=(ushort)v,false);
N("VistiingPlayerDatabaseInsertIndex",Avenue5Text.Get("JoinAvenueSettingsEditor.L_PlayerIDInsert"),31,()=>settings.VistiingPlayerDatabaseInsertIndex,v=>settings.VistiingPlayerDatabaseInsertIndex=(ushort)v,false);
N("Seed",Avenue5Text.Get("JoinAvenueSettingsEditor.L_Seed"),4294967295,()=>settings.Seed,v=>settings.Seed=(uint)v,false);
N("PromotionDaysElapsed",Avenue5Text.Get("JoinAvenueSettingsEditor.L_PromotionDaysElapsed"),65535,()=>settings.PromotionDaysElapsed,v=>settings.PromotionDaysElapsed=(ushort)v,false);
N("IsPromotionActive",Avenue5Text.Get("JoinAvenueSettingsEditor.L_IsPromotionActive"),1,()=>settings.IsPromotionActive?1:0,v=>settings.IsPromotionActive=v==1,true);
 fields.Insert(fields.FindIndex(d=>d.Id=="Flags"),NumberChoice("CeilingColor",Avenue5Text.Get("JoinAvenueSettingsEditor.L_CeilingColor"),()=>(int)settings.CeilingColor,v=>settings.CeilingColor=(JoinAvenueCeilingColor5)v,Enum.GetValues<JoinAvenueCeilingColor5>().Select(c=>new OriginChoice((int)c,Avenue5Text.Get("JoinAvenueCeilingColor5."+c))).ToArray())with{Group="settings"});
 for(int i=0;i<32;i++){int index=i;foreach(bool sid in new[]{false,true}){int shift=sid?16:0;fields.Add(Avenue5Definition.Text((sid?"SID":"TID")+i,"database",new((sid?"秘密ID":"训练家ID")+" "+(i+1),(sid?"SID":"TID")+" "+(i+1),(sid?"裏ID":"表ID")+" "+(i+1)),32767,()=>((ushort)(settings.GetVisitingPlayerTrainerID(index)>>shift)).ToString("00000"),text=>{ushort.TryParse(text,out var number);uint old=settings.GetVisitingPlayerTrainerID(index);settings.SetVisitingPlayerTrainerID(index,sid?(old&65535)|((uint)number<<16):(old&0xFFFF0000)|number); }));}}
 return fields; }
}
