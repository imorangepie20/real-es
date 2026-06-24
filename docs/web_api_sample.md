아파트 - 웹 API 교체(읍,면,동 바운더리 버전으로)
curl 'https://fin.land.naver.com/front-api/v1/complex/boundedComplexes' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7' \
  -H 'baggage: sentry-environment=real,sentry-release=property-web%402026.06.17,sentry-public_key=ec5063b7741b4a9282a85c1e2f27ab09,sentry-trace_id=1bde231d18ab41218c2afa3df86c6c48' \
  -H 'content-type: application/json' \
  -b 'NAC=l72SBERlv1OO; landHomeFlashUseYn=Y; nstore_session=KP5umJOEdYDd22w82d8B9xfW; map_snb_collapsed=false; PROP_TEST_KEY=1780374773932.9fe546bc4470b5965f30c4f93d1e2c77daafd3653744103b3465ce94bbc75f7d; PROP_TEST_ID=9791860f243b9cd506f4a7401059dcfbf0d8465db4f8df2e5559d2dabb62d4bd; nhn.realestate.article.rlet_type_cd=A01; nhn.realestate.article.trade_type_cd=""; nhn.realestate.article.ipaddress_city=4100000000; nid_inf=-1146586345; BUC=bgioqW42ACQh1F7dbMePCFWCOJr0MuHjVX2zM8X3D2I=' \
  -H 'origin: https://fin.land.naver.com' \
  -H 'priority: u=1, i' \
  -H 'referer: https://fin.land.naver.com/map?center=3zlGmI-2Az2Ny&zoom=14&showOnlySelectedRegion=true&tradeTypes=A1&realEstateTypes=A02-A01&hasArticleComplex=true&layer=NobwRAlgJmBcYGMD2BbADgGwKYA8D6GEAzgC5gA0YRWAhgE4IAWACvTSkXCAL6V1YkArnQB2NAEbY4JOoKzcAukA' \
  -H 'sec-ch-ua: "Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'sentry-trace: 1bde231d18ab41218c2afa3df86c6c48-9e3ed5b966c9a551' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36' \
  --data-raw '{"filter":{"tradeTypes":["A1"],"realEstateTypes":["A02","A01"],"roomCount":[],"bathRoomCount":[],"optionTypes":[],"oneRoomShapeTypes":[],"moveInTypes":[],"filtersExclusiveSpace":false,"floorTypes":[],"directionTypes":[],"hasArticlePhoto":false,"isAuthorizedByOwner":false,"parkingTypes":[],"entranceTypes":[],"hasArticle":true,"legalDivisionNumbers":["4111710500"],"legalDivisionType":"EUP"},"boundingBox":{"left":127.03972521667743,"right":127.10787478332844,"top":37.270688736529536,"bottom":37.24250862799451},"precision":14,"userChannelType":"PC","complexPagingRequest":{"size":30,"complexSortType":"POPULARITY_DESC","lastInfo":[]}}'

{
    "isSuccess": true,
    "detailCode": "success",
    "message": "",
    "result": {
        "seed": "m_q4QQIQdmlsbGFfY29tcGxleF92MRZJcHJLOTJmUlJZSzBaazlELUxjOEZBABZZOG93QUQxMlE2Q1dSMk93WTRIR1BBAAAAAADl4dCkFjd1OEtGd1l3UmVXTmdEcGVzMTgzQUEKY29tcGxleF92MRY4cWM5VUJWcFE3dVk4YTR2eGw4aE5nABZHMTZ4VldOWVFvLXEzSW1NNFJmbURBAAAAAABfXFIHFmQ4eDdQdGg3VFR5eGFiVkxoeC1LMEECFjhxYzlVQlZwUTd1WThhNHZ4bDhoTmcAABZJcHJLOTJmUlJZSzBaazlELUxjOEZBAAA=",
        "lastInfo": [
            1,
            "1812"
        ],
        "hasNextPage": true,
        "totalCount": 40,
        "list": [
            {
                "type": "COMPLEX",
                "complex": {
                    "complexInfo": {
                        "complexNumber": 12045,
                        "name": "벽적골8단지두산,우성,한신",
                        "type": "A01",
                        "buildingCount": 18,
                        "totalHouseholdNumber": 1842,
                        "representativePhotoUrl": "https://landthumb-phinf.pstatic.net/20171019_190/apt_realimage_1508390741283KHEH4_JPEG/f3d2b33fcfd5dffa847f2e29a2142ca8.jpg",
                        "isComplexTourExist": false,
                        "address": {
                            "city": "경기도",
                            "division": "수원시 영통구",
                            "sector": "경기도 수원시 영통구 영통동",
                            "jibun": "973-3",
                            "roadName": "영통로 232",
                            "coordinates": {
                                "xCoordinate": 127.059237,
                                "yCoordinate": 37.2477
                            }
                        },
                        "useApprovalDate": "19971216",
                        "approvalElapsedYear": 29
                    },
                    "articlePriceInfoDto": {
                        "dealMinPrice": 425000000,
                        "dealMaxPrice": 600000000,
                        "rentMinPrice": 250000000,
                        "rentMaxPrice": 270000000,
                        "rentMonthlyLeaseMinPrice": 10000000,
                        "rentMonthlyLeaseMaxPrice": 200000000,
                        "rentMonthlyMinPrice": 800000,
                        "rentMonthlyMaxPrice": 200000,
                        "rentShortLeaseMinPrice": 10000000,
                        "rentShortLeaseMaxPrice": 20000000,
                        "rentShortMinPrice": 1000000,
                        "rentShortMaxPrice": 1000000
                    },
                    "articleCountInfoDto": {
                        "dealCount": 118,
                        "leaseDepositCount": 2,
                        "leaseMonthlyCount": 14,
                        "leaseShortTerm": 3
                    },
                    "totalCommentCount": 18,
                    "mostRecentComment": {
                        "commentNumber": "896458041656868934",
                        "content": "분담금 얼마인가요",
                        "registerDateTime": "2026-06-16T02:20:11",
                        "modifiedDateTime": "2026-06-16T02:20:11"
                    },
                    "haveFavorite": false,
                    "url": "https://fin.land.naver.com/complexes/12045?tab=article"
                }
            },
            ......

fetch("https://fin.land.naver.com/front-api/v1/complex/article/list", {
  "headers": {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7",
    "baggage": "sentry-environment=real,sentry-release=property-web%402026.06.17,sentry-public_key=ec5063b7741b4a9282a85c1e2f27ab09,sentry-trace_id=b27be7f274064c6ea5fd26765a6b34da",
    "content-type": "application/json",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Google Chrome\";v=\"149\", \"Chromium\";v=\"149\", \"Not)A;Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "sentry-trace": "b27be7f274064c6ea5fd26765a6b34da-a7c40e0d9300f6ca"
  },
  "referrer": "https://fin.land.naver.com/map?center=3zkHlW-2AyFE4&zoom=14.106326324647169&showOnlySelectedRegion=true&tradeTypes=A1&realEstateTypes=A01&hasArticleComplex=true&layer=NobwRAlgJmBcYGMD2BbADgGwKYA8D6UWALgIYQZgA0YaJATiSgM5zjLrY4CSM8AjACYADABYArGAC%2B1JlnoIAFgAV6jFrHCkARnDD0iEBNip66Bo1gAqDQpYCeaLOrABBPlOp1iAVzoA7Ei1jWCI6byxJAF0gA",
  "body": "{\"size\":30,\"complexNumber\":\"12045\",\"tradeTypes\":[\"A1\"],\"pyeongTypes\":[],\"dongNumbers\":[],\"userChannelType\":\"PC\",\"articleSortType\":\"RANKING_DESC\",\"lastInfo\":[]}",
  "method": "POST",
  "mode": "cors",
  "credentials": "include"
});

{
    "isSuccess": true,
    "detailCode": "success",
    "message": "",
    "result": {
        "seed": "480935c4-526b-4a91-861e-e148d30ed894",
        "lastInfo": [
            1,
            940.7444158267733,
            "2632714757"
        ],
        "hasNextPage": true,
        "totalCount": 118,
        "list": [
            {
                "representativeArticleInfo": {
                    "complexName": "벽적골8단지두산,우성,한신",
                    "articleNumber": "2633809010",
                    "articleName": "벽적골8단지두산,우성,한신",
                    "dongName": "806",
                    "tradeType": "A1",
                    "realEstateType": "A01",
                    "spaceInfo": {
                        "supplySpace": 80.54,
                        "contractSpace": 93.23,
                        "exclusiveSpace": 59.84,
                        "landSpace": 63229,
                        "floorSpace": 0,
                        "supplySpaceName": "80B",
                        "exclusiveSpaceName": "59B",
                        "nameType": "B"
                    },
                    "landInfo": {},
                    "buildingInfo": {
                        "buildingConjunctionDateType": "CDY01",
                        "buildingConjunctionDate": "19971216",
                        "approvalElapsedYear": 29
                    },
                    "verificationInfo": {
                        "verificationType": "NDOC1",
                        "isAssociationArticle": false,
                        "exposureStartDate": "2026-06-23",
                        "articleConfirmDate": "2026-06-23"
                    },
                    "brokerInfo": {
                        "cpId": "fine",
                        "brokerageName": "좋은날공인중개사사무소",
                        "brokerName": "부동산포스",
                        "cpOutLinkType": "CP_NAME"
                    },
                    "articleDetail": {
                        "direction": "EE",
                        "directionStandard": "거실 기준",
                        "articleFeatureDescription": "입주가능,방,거실확장,샷시포함올수리",
                        "directTrade": false,
                        "floorInfo": "18/20",
                        "floorDetailInfo": {
                            "targetFloor": "18",
                            "totalFloor": "20",
                            "groundTotalFloor": "0",
                            "undergroundTotalFloor": "0",
                            "floorType": "10",
                            "residenceType": "1"
                        },
                        "isSafeLessorOfHug": false
                    },
                    "articleMediaDto": {
                        "imageCount": 0,
                        "isVrExposed": false,
                        "photos": []
                    },
                    "articleMedia": {
                        "imageCount": 0,
                        "isVrExposed": false,
                        "photos": []
                    },
                    "address": {
                        "city": "경기도",
                        "division": "수원시 영통구",
                        "sector": "영통동",
                        "coordinates": {
                            "xCoordinate": 127.058292,
                            "yCoordinate": 37.247539
                        }
                    },
                    "priceInfo": {
                        "dealPrice": 495000000,
                        "warrantyPrice": 0,
                        "rentPrice": 0,
                        "managementFeeAmount": 250000,
                        "priceChangeStatus": 0
                    }
                },
                "duplicatedArticleInfo": {
                    "representativePriceInfo": {
                        "dealPrice": {
                            "minPrice": 495000000,
                            "maxPrice": 495000000
                        },
                        "warrantyPrice": {
                            "minPrice": 0,
                            "maxPrice": 0
                        },
                        "rentPrice": {
                            "minPrice": 0,
                            "maxPrice": 0
                        },
                        "premiumPrice": {
                            "minPrice": 0,
                            "maxPrice": 0
                        }
                    },
                    "realtorCount": 2,
                    "directTradeCount": 0,
                    "articleInfoList": [
                        {
                            "complexName": "벽적골8단지두산,우성,한신",
                            "articleNumber": "2633809010",
                            "articleName": "벽적골8단지두산,우성,한신",
                            "dongName": "806",
                            "tradeType": "A1",
                            "realEstateType": "A01",
                            "spaceInfo": {
                                "supplySpace": 80.54,
                                "contractSpace": 93.23,
                                "exclusiveSpace": 59.84,
                                "landSpace": 63229,
                                "floorSpace": 0,
                                "supplySpaceName": "80B",
                                "exclusiveSpaceName": "59B",
                                "nameType": "B"
                            },
                            "landInfo": {},
                            "buildingInfo": {
                                "buildingConjunctionDateType": "CDY01",
                                "buildingConjunctionDate": "19971216",
                                "approvalElapsedYear": 29
                            },
                            "verificationInfo": {
                                "verificationType": "NDOC1",
                                "isAssociationArticle": false,
                                "exposureStartDate": "2026-06-23",
                                "articleConfirmDate": "2026-06-23"
                            },
                            "brokerInfo": {
                                "cpId": "fine",
                                "brokerageName": "좋은날공인중개사사무소",
                                "brokerName": "부동산포스",
                                "cpOutLinkType": "CP_NAME"
                            },
                            "articleDetail": {
                                "direction": "EE",
                                "directionStandard": "거실 기준",
                                "articleFeatureDescription": "입주가능,방,거실확장,샷시포함올수리",
                                "directTrade": false,
                                "floorInfo": "18/20",
                                "floorDetailInfo": {
                                    "targetFloor": "18",
                                    "totalFloor": "20",
                                    "groundTotalFloor": "0",
                                    "undergroundTotalFloor": "0",
                                    "floorType": "10",
                                    "residenceType": "1"
                                },
                                "isSafeLessorOfHug": false
                            },
                            "articleMediaDto": {
                                "imageCount": 0,
                                "isVrExposed": false,
                                "photos": []
                            },
                            "articleMedia": {
                                "imageCount": 0,
                                "isVrExposed": false,
                                "photos": []
                            },
                            "address": {
                                "city": "경기도",
                                "division": "수원시 영통구",
                                "sector": "영통동",
                                "coordinates": {
                                    "xCoordinate": 127.058292,
                                    "yCoordinate": 37.247539
                                }
                            },
                            "priceInfo": {
                                "dealPrice": 495000000,
                                "warrantyPrice": 0,
                                "rentPrice": 0,
                                "managementFeeAmount": 250000,
                                "priceChangeStatus": 0
                            },
                            "haveFavorite": false
                        },
                        {
                            "complexName": "벽적골8단지두산,우성,한신",
                            "articleNumber": "2633311183",
                            "articleName": "벽적골8단지두산,우성,한신",
                            "dongName": "806",
                            "tradeType": "A1",
                            "realEstateType": "A01",
                            "spaceInfo": {
                                "supplySpace": 80.54,
                                "contractSpace": 93.23,
                                "exclusiveSpace": 59.84,
                                "landSpace": 63229,
                                "floorSpace": 0,
                                "supplySpaceName": "80B",
                                "exclusiveSpaceName": "59B",
                                "nameType": "B"
                            },
                            "landInfo": {},
                            "buildingInfo": {
                                "buildingConjunctionDateType": "CDY01",
                                "buildingConjunctionDate": "19971216",
                                "approvalElapsedYear": 29
                            },
                            "verificationInfo": {
                                "verificationType": "OWNER",
                                "isAssociationArticle": false,
                                "exposureStartDate": "2026-06-20",
                                "articleConfirmDate": "2026-06-20"
                            },
                            "brokerInfo": {
                                "cpId": "NEONET",
                                "brokerageName": "에이스공인중개사사무소",
                                "brokerName": "부동산뱅크",
                                "cpOutLinkType": "CP_NAME"
                            },
                            "articleDetail": {
                                "direction": "EE",
                                "directionStandard": "거실 기준",
                                "articleFeatureDescription": "역 바로앞 선호동,로열층,샷시포함올수리, 방과거실 확장,리모델링확정",
                                "directTrade": false,
                                "floorInfo": "고/20",
                                "floorDetailInfo": {
                                    "targetFloor": "고",
                                    "totalFloor": "20",
                                    "groundTotalFloor": "0",
                                    "undergroundTotalFloor": "0",
                                    "floorType": "20",
                                    "residenceType": "1"
                                },
                                "isSafeLessorOfHug": false
                            },
                            "articleMediaDto": {
                                "imageCount": 0,
                                "isVrExposed": false,
                                "photos": []
                            },
                            "articleMedia": {
                                "imageCount": 0,
                                "isVrExposed": false,
                                "photos": []
                            },
                            "address": {
                                "city": "경기도",
                                "division": "수원시 영통구",
                                "sector": "영통동",
                                "coordinates": {
                                    "xCoordinate": 127.058292,
                                    "yCoordinate": 37.247539
                                }
                            },
                            "priceInfo": {
                                "dealPrice": 495000000,
                                "warrantyPrice": 0,
                                "rentPrice": 0,
                                "managementFeeAmount": 200000,
                                "priceChangeStatus": 0
                            },
                            "haveFavorite": false
                        }
                    ]
                }
            }, ......

Division
fetch("https://fin.land.naver.com/front-api/v1/legalDivision/subInfoList?legalDivisionLevelType=EUP&legalDivisionNumber=4111700000", {
  "headers": {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7",
    "baggage": "sentry-environment=real,sentry-release=property-web%402026.06.17,sentry-public_key=ec5063b7741b4a9282a85c1e2f27ab09,sentry-trace_id=e033b70fd65a4bc8a89125ebd481674f",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Google Chrome\";v=\"149\", \"Chromium\";v=\"149\", \"Not)A;Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "sentry-trace": "e033b70fd65a4bc8a89125ebd481674f-87c574d1c8f67ea2"
  },
  "referrer": "https://fin.land.naver.com/map?center=3zllBU-2AyS7W&zoom=14.106326324647169&showOnlySelectedRegion=true&tradeTypes=A1&realEstateTypes=A02&hasArticleComplex=true&layer=NobwRAlgJmBcYGMD2BbADgGwKYA8D6UWALgIYQZgA0YaJATiSgM5zjLrY4CSM8AjHwAMAJgDsfMAF9qTLPQQALAAr1GLWOFIAjOGHpEICbFT10DRrABUGhSwE80WdWACCE6WDrEArnQB2JFrGsER03liSALpAA",
  "body": null,
  "method": "GET",
  "mode": "cors",
  "credentials": "include"
});
{
    "isSuccess": true,
    "result": [
        {
            "legalDivisionNumber": "4111710700",
            "legalDivisionName": "망포동",
            "legalDivisionLevelType": "EUP",
            "coordinates": {
                "xCoordinate": 127.0524,
                "yCoordinate": 37.2397
            }
        },
        {
            "legalDivisionNumber": "4111710100",
            "legalDivisionName": "매탄동",
            "legalDivisionLevelType": "EUP",
            "coordinates": {
                "xCoordinate": 127.0505,
                "yCoordinate": 37.2637
            }
        },
        {
            "legalDivisionNumber": "4111710600",
            "legalDivisionName": "신동",
            "legalDivisionLevelType": "EUP",
            "coordinates": {
                "xCoordinate": 127.045963,
                "yCoordinate": 37.246479
            }
        },
        {
            "legalDivisionNumber": "4111710500",
            "legalDivisionName": "영통동",
            "legalDivisionLevelType": "EUP",
            "coordinates": {
                "xCoordinate": 127.0738,
                "yCoordinate": 37.2566
            }
        },
        {
            "legalDivisionNumber": "4111710200",
            "legalDivisionName": "원천동",
            "legalDivisionLevelType": "EUP",
            "coordinates": {
                "xCoordinate": 127.057235,
                "yCoordinate": 37.273673
            }
        },
        {
            "legalDivisionNumber": "4111710300",
            "legalDivisionName": "이의동",
            "legalDivisionLevelType": "EUP",
            "coordinates": {
                "xCoordinate": 127.048381,
                "yCoordinate": 37.30117
            }
        },
        {
            "legalDivisionNumber": "4111710400",
            "legalDivisionName": "하동",
            "legalDivisionLevelType": "EUP",
            "coordinates": {
                "xCoordinate": 127.069163,
                "yCoordinate": 37.284142
            }
        }
    ]
}





오피스텔
fetch("https://fin.land.naver.com/front-api/v1/complex/boundedComplexes", {
  "headers": {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7",
    "baggage": "sentry-environment=real,sentry-release=property-web%402026.06.17,sentry-public_key=ec5063b7741b4a9282a85c1e2f27ab09,sentry-trace_id=fcb7e482ec9d4674b21de054998882ac",
    "content-type": "application/json",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Google Chrome\";v=\"149\", \"Chromium\";v=\"149\", \"Not)A;Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "sentry-trace": "fcb7e482ec9d4674b21de054998882ac-b95daba4aa23f111"
  },
  "referrer": "https://fin.land.naver.com/map?center=3zlqg9-2Az0Hd&zoom=14.106326324647169&showOnlySelectedRegion=true&tradeTypes=A1&realEstateTypes=A02&hasArticleComplex=true&layer=NobwRAlgJmBcYGMD2BbADgGwKYA8D6GEAzgC5gA0YRWAhgE4IAWACvTSkXCAL6V1YkArnQB2NAEbY4JOoKzcAukA",
  "body": "{\"filter\":{\"tradeTypes\":[\"A1\"],\"realEstateTypes\":[\"A02\"],\"roomCount\":[],\"bathRoomCount\":[],\"optionTypes\":[],\"oneRoomShapeTypes\":[],\"moveInTypes\":[],\"filtersExclusiveSpace\":false,\"floorTypes\":[],\"directionTypes\":[],\"hasArticlePhoto\":false,\"isAuthorizedByOwner\":false,\"parkingTypes\":[],\"entranceTypes\":[],\"hasArticle\":true,\"legalDivisionNumbers\":[\"4111710500\"],\"legalDivisionType\":\"EUP\"},\"boundingBox\":{\"left\":127.03595512082671,\"right\":127.09926269690197,\"top\":37.2688798472866,\"bottom\":37.24270163967803},\"precision\":14.106326324647169,\"userChannelType\":\"PC\",\"complexPagingRequest\":{\"size\":30,\"complexSortType\":\"POPULARITY_DESC\",\"lastInfo\":[]}}",
  "method": "POST",
  "mode": "cors",
  "credentials": "include"
});

{
    "isSuccess": true,
    "detailCode": "success",
    "message": "",
    "result": {
        "seed": "m_q4QQIQdmlsbGFfY29tcGxleF92MRZJcHJLOTJmUlJZSzBaazlELUxjOEZBABZ4X0dkLVlHc1NoaTV4VWlidVdpTUpnAAAAAACpyFmpFmlDQU1nQVpVUmdlQXUySERJUWZvSlEKY29tcGxleF92MRY4cWM5VUJWcFE3dVk4YTR2eGw4aE5nABZ4X0dkLVlHc1NoaTV4VWlidVdpTUpnAAAAAACpyFmoFmlDQU1nQVpVUmdlQXUySERJUWZvSlECFjhxYzlVQlZwUTd1WThhNHZ4bDhoTmcAABZJcHJLOTJmUlJZSzBaazlELUxjOEZBAAA=",
        "lastInfo": [
            1,
            "110271"
        ],
        "hasNextPage": false,
        "totalCount": 9,
        "list": [
            {
                "type": "COMPLEX",
                "complex": {
                    "complexInfo": {
                        "complexNumber": 114311,
                        "name": "영통역아이파크",
                        "type": "A02",
                        "buildingCount": 1,
                        "totalHouseholdNumber": 666,
                        "isComplexTourExist": false,
                        "address": {
                            "city": "경기도",
                            "division": "수원시 영통구",
                            "sector": "경기도 수원시 영통구 영통동",
                            "jibun": "1012-1",
                            "roadName": "반달로35번길 30",
                            "coordinates": {
                                "xCoordinate": 127.077443,
                                "yCoordinate": 37.251873
                            }
                        },
                        "useApprovalDate": "20170926",
                        "approvalElapsedYear": 9
                    },
                    "articlePriceInfoDto": {
                        "dealMinPrice": 130000000,
                        "dealMaxPrice": 380000000,
                        "rentMinPrice": 140000000,
                        "rentMaxPrice": 141000000,
                        "rentMonthlyLeaseMinPrice": 5000000,
                        "rentMonthlyLeaseMaxPrice": 40000000,
                        "rentMonthlyMinPrice": 750000,
                        "rentMonthlyMaxPrice": 440000
                    },
                    "articleCountInfoDto": {
                        "dealCount": 47,
                        "leaseDepositCount": 2,
                        "leaseMonthlyCount": 19,
                        "leaseShortTerm": 0
                    },
                    "totalCommentCount": 0,
                    "haveFavorite": false,
                    "url": "https://fin.land.naver.com/complexes/114311?tab=article"
                }
            },
curl 'https://fin.land.naver.com/front-api/v1/complex/article/list' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7' \
  -H 'baggage: sentry-environment=real,sentry-release=property-web%402026.06.17,sentry-public_key=ec5063b7741b4a9282a85c1e2f27ab09,sentry-trace_id=e033b70fd65a4bc8a89125ebd481674f' \
  -H 'content-type: application/json' \
  -b 'NAC=l72SBERlv1OO; landHomeFlashUseYn=Y; nstore_session=KP5umJOEdYDd22w82d8B9xfW; map_snb_collapsed=false; PROP_TEST_KEY=1780374773932.9fe546bc4470b5965f30c4f93d1e2c77daafd3653744103b3465ce94bbc75f7d; PROP_TEST_ID=9791860f243b9cd506f4a7401059dcfbf0d8465db4f8df2e5559d2dabb62d4bd; nhn.realestate.article.rlet_type_cd=A01; nhn.realestate.article.trade_type_cd=""; nhn.realestate.article.ipaddress_city=4100000000; nid_inf=-1146586345; BUC=bgioqW42ACQh1F7dbMePCFWCOJr0MuHjVX2zM8X3D2I=' \
  -H 'origin: https://fin.land.naver.com' \
  -H 'priority: u=1, i' \
  -H 'referer: https://fin.land.naver.com/map?center=3zlq9I-2AyZ7Y&zoom=14.106326324647169&showOnlySelectedRegion=true&tradeTypes=A1&realEstateTypes=A02&hasArticleComplex=true&layer=NobwRAlgJmBcYGMD2BbADgGwKYA8D6UWALgIYQZgA0YaJATiSgM5zjLrY4CSM8AjHwAMAJgDsfMAF9qTLPQQALAAr1GLWOFIAjOGHpEICbFT10DRrABUGhSwE80WdWACCE6WDrEArnQB2JFrGsER03liSALpAA' \
  -H 'sec-ch-ua: "Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'sentry-trace: e033b70fd65a4bc8a89125ebd481674f-87c574d1c8f67ea2' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36' \
  --data-raw '{"size":30,"complexNumber":"110271","tradeTypes":["A1"],"pyeongTypes":[],"dongNumbers":[],"userChannelType":"PC","articleSortType":"RANKING_DESC","lastInfo":[]}'

{
    "isSuccess": true,
    "detailCode": "success",
    "message": "",
    "result": {
        "seed": "d1c4f5b5-b350-4f48-aeb5-f06b4c68bdb7",
        "lastInfo": [
            1,
            490.36871353947015,
            "2630451814"
        ],
        "hasNextPage": false,
        "totalCount": 18,
        "list": [
            {
                "representativeArticleInfo": {
                    "complexName": "영통클래시아",
                    "articleNumber": "2633825340",
                    "articleName": "영통클래시아",
                    "dongName": "1",
                    "tradeType": "A1",
                    "realEstateType": "A02",
                    "spaceInfo": {
                        "supplySpace": 38.67,
                        "contractSpace": 65.37,
                        "exclusiveSpace": 24.38,
                        "landSpace": 2059,
                        "floorSpace": 0,
                        "supplySpaceName": "65A",
                        "exclusiveSpaceName": "24A",
                        "nameType": "A"
                    },
                    "landInfo": {},
                    "buildingInfo": {
                        "buildingConjunctionDateType": "CDY01",
                        "buildingConjunctionDate": "20170524",
                        "approvalElapsedYear": 10
                    },
                    "verificationInfo": {
                        "verificationType": "OWNER",
                        "isAssociationArticle": false,
                        "exposureStartDate": "2026-06-23",
                        "articleConfirmDate": "2026-06-23"
                    },
                    "brokerInfo": {
                        "cpId": "SERVE",
                        "brokerageName": "영통역IPARK부동산중개사무소",
                        "brokerName": "부동산써브",
                        "cpOutLinkType": "CP_NAME"
                    },
                    "articleDetail": {
                        "direction": "ES",
                        "directionStandard": "안방 기준",
                        "articleFeatureDescription": "매매,세안고,인기많은 로얄층,방향좋은곳,27년8월 실입주",
                        "directTrade": false,
                        "floorInfo": "8/15",
                        "floorDetailInfo": {
                            "targetFloor": "8",
                            "totalFloor": "15",
                            "groundTotalFloor": "0",
                            "undergroundTotalFloor": "0",
                            "floorType": "10",
                            "residenceType": "1"
                        },
                        "isSafeLessorOfHug": false
                    },
                    "articleMediaDto": {
                        "imageCount": 0,
                        "isVrExposed": false,
                        "photos": []
                    },
                    "articleMedia": {
                        "imageCount": 0,
                        "isVrExposed": false,
                        "photos": []
                    },
                    "address": {
                        "city": "경기도",
                        "division": "수원시 영통구",
                        "sector": "영통동",
                        "coordinates": {
                            "xCoordinate": 127.074687,
                            "yCoordinate": 37.252505
                        }
                    },
                    "priceInfo": {
                        "dealPrice": 145000000,
                        "warrantyPrice": 0,
                        "rentPrice": 0,
                        "managementFeeAmount": 80000,
                        "priceChangeStatus": 0
                    }
                }
            }, .....  









상가
fetch("https://fin.land.naver.com/front-api/v1/article/boundedArticles", {
  "headers": {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7",
    "baggage": "sentry-environment=real,sentry-release=property-web%402026.06.17,sentry-public_key=ec5063b7741b4a9282a85c1e2f27ab09,sentry-trace_id=e83d498f5e3540dfa1cdc92e12a47cfb",
    "content-type": "application/json",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Google Chrome\";v=\"149\", \"Chromium\";v=\"149\", \"Not)A;Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "sentry-trace": "e83d498f5e3540dfa1cdc92e12a47cfb-b9b22878bc081467"
  },
  "referrer": "https://fin.land.naver.com/map?center=3zkHlW-2AyFE4&zoom=14.106326324647169&showOnlySelectedRegion=true&tradeTypes=A1&realEstateTypes=D02&hasArticleComplex=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX3JJsKAK5IAdggBGOOCiTLssgLpA",
  "body": "{\"filter\":{\"tradeTypes\":[\"A1\"],\"realEstateTypes\":[\"D02\"],\"roomCount\":[],\"bathRoomCount\":[],\"optionTypes\":[],\"oneRoomShapeTypes\":[],\"moveInTypes\":[],\"filtersExclusiveSpace\":false,\"floorTypes\":[],\"directionTypes\":[],\"hasArticlePhoto\":false,\"isAuthorizedByOwner\":false,\"parkingTypes\":[],\"entranceTypes\":[],\"hasArticle\":true,\"legalDivisionNumbers\":[\"4111710500\"],\"legalDivisionType\":\"EUP\"},\"boundingBox\":{\"left\":127.0186930422741,\"right\":127.08200061834924,\"top\":37.26078937261502,\"bottom\":37.23460835330171},\"precision\":14.106326324647169,\"userChannelType\":\"PC\",\"articlePagingRequest\":{\"size\":30,\"articleSortType\":\"RANKING_DESC\",\"lastInfo\":[]}}",
  "method": "POST",
  "mode": "cors",
  "credentials": "include"
});

{
    "isSuccess": true,
    "detailCode": "success",
    "message": "",
    "result": {
        "seed": "cdbe8f77-5364-4549-ac17-7a4b98ad3df1",
        "lastInfo": [
            1,
            920.6334302063394,
            "2632698513"
        ],
        "hasNextPage": true,
        "totalCount": 184,
        "list": [
            {
                "representativeArticleInfo": {
                    "articleNumber": "2633824750",
                    "articleName": "복합상가",
                    "buildingType": "D0204",
                    "tradeType": "A1",
                    "realEstateType": "D02",
                    "spaceInfo": {
                        "supplySpace": 100,
                        "exclusiveSpace": 54,
                        "landSpace": 0,
                        "floorSpace": 0,
                        "exclusiveSpaceName": "54"
                    },
                    "landInfo": {
                        "currentPurpose": "기타",
                        "recommendedPurpose": "소매점,판매점"
                    },
                    "buildingInfo": {
                        "buildingConjunctionDateType": "CDY01",
                        "buildingConjunctionDate": "20030808",
                        "approvalElapsedYear": 23
                    },
                    "verificationInfo": {
                        "verificationType": "MOBL",
                        "isAssociationArticle": false,
                        "exposureStartDate": "2026-06-23",
                        "articleConfirmDate": "2026-06-23"
                    },
                    "brokerInfo": {
                        "cpId": "SERVE",
                        "brokerageName": "영통역IPARK부동산중개사무소",
                        "brokerName": "부동산써브",
                        "cpOutLinkType": "CP_NAME"
                    },
                    "articleDetail": {
                        "direction": "WW",
                        "directionStandard": "주된 출입구 기준",
                        "articleFeatureDescription": "대로변1층,A급수익성상가,안정적수익율",
                        "directTrade": false,
                        "floorInfo": "1/10",
                        "floorDetailInfo": {
                            "targetFloor": "1",
                            "totalFloor": "10",
                            "groundTotalFloor": "0",
                            "undergroundTotalFloor": "0",
                            "floorType": "00",
                            "residenceType": "1"
                        },
                        "isSafeLessorOfHug": false
                    },
                    "articleMediaDto": {
                        "imageCount": 0,
                        "isVrExposed": false,
                        "photos": []
                    },
                    "articleMedia": {
                        "imageCount": 0,
                        "isVrExposed": false,
                        "photos": []
                    },
                    "address": {
                        "city": "경기도",
                        "division": "수원시 영통구",
                        "sector": "영통동",
                        "coordinates": {
                            "xCoordinate": 127.0750347,
                            "yCoordinate": 37.2544778
                        }
                    },
                    "priceInfo": {
                        "dealPrice": 890000000,
                        "warrantyPrice": 0,
                        "rentPrice": 0,
                        "managementFeeAmount": 150000,
                        "priceChangeStatus": 0
                    }
                }
            },....

아파트/오피스텔 이외 매물 표시는 특정 지역 매물수의 합으로 (원 안의 숫자) - 지도에 표시
fetch("https://fin.land.naver.com/front-api/v1/article/map/articleClusters", {
  "headers": {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7",
    "baggage": "sentry-environment=real,sentry-release=property-web%402026.06.17,sentry-public_key=ec5063b7741b4a9282a85c1e2f27ab09,sentry-trace_id=2c0a566be7d640e8b13d3ea591fbe875",
    "content-type": "application/json",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Google Chrome\";v=\"149\", \"Chromium\";v=\"149\", \"Not)A;Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "sentry-trace": "2c0a566be7d640e8b13d3ea591fbe875-8fdbd1b6a4693392"
  },
  "referrer": "https://fin.land.naver.com/map?center=3zlqg9-2Az0Hd&zoom=14.106326324647169&showOnlySelectedRegion=true&tradeTypes=A1&realEstateTypes=D05-D02&hasArticleComplex=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhAIJ0AygFUAMgFEwAX1kBdIA",
  "body": "{\"filter\":{\"tradeTypes\":[\"A1\"],\"realEstateTypes\":[\"D05\",\"D02\"],\"roomCount\":[],\"bathRoomCount\":[],\"optionTypes\":[],\"oneRoomShapeTypes\":[],\"moveInTypes\":[],\"filtersExclusiveSpace\":false,\"floorTypes\":[],\"directionTypes\":[],\"hasArticlePhoto\":false,\"isAuthorizedByOwner\":false,\"parkingTypes\":[],\"entranceTypes\":[],\"hasArticle\":true,\"legalDivisionNumbers\":[\"4111710500\"],\"legalDivisionType\":\"EUP\"},\"boundingBox\":{\"left\":127.03595512082671,\"right\":127.09926269690197,\"top\":37.2688798472866,\"bottom\":37.24270163967803},\"precision\":14.106326324647169,\"userChannelType\":\"PC\"}",
  "method": "POST",
  "mode": "cors",
  "credentials": "include"
});
{
    "isSuccess": true,
    "detailCode": "success",
    "message": "",
    "result": {
        "totalCount": 208,
        "clusters": [
            {
                "clusterId": "16/55901/25450",
                "coordinates": {
                    "xCoordinate": 127.07511294,
                    "yCoordinate": 37.25375158
                },
                "articleCount": 72
            },
            {
                "clusterId": "16/55901/25451",
                "coordinates": {
                    "xCoordinate": 127.07674677,
                    "yCoordinate": 37.25153203
                },
                "articleCount": 61
            },
            {
                "clusterId": "16/55898/25452",
                "coordinates": {
                    "xCoordinate": 127.0607214,
                    "yCoordinate": 37.24627692
                },
                "articleCount": 21
            },
            {
                "clusterId": "16/55902/25447",
                "coordinates": {
                    "xCoordinate": 127.08266088,
                    "yCoordinate": 37.26694203
                },
                "articleCount": 10
            },
            {
                "clusterId": "16/55897/25452",
                "coordinates": {
                    "xCoordinate": 127.05669691,
                    "yCoordinate": 37.24696553
                },
                "articleCount": 8
            },
            {
                "clusterId": "16/55902/25450",
                "coordinates": {
                    "xCoordinate": 127.07939497,
                    "yCoordinate": 37.25462091
                },
                "articleCount": 6
            },
            {
                "clusterId": "16/55899/25451",
                "coordinates": {
                    "xCoordinate": 127.06567426,
                    "yCoordinate": 37.25119932
                },
                "articleCount": 5
            },
            {
                "clusterId": "16/55902/25451",
                "coordinates": {
                    "xCoordinate": 127.07943519,
                    "yCoordinate": 37.24861158
                },
                "articleCount": 5
            },
            {
                "clusterId": "16/55901/25448",
                "coordinates": {
                    "xCoordinate": 127.0777693,
                    "yCoordinate": 37.263867
                },
                "articleCount": 4
            },
            {
                "clusterId": "16/55902/25448",
                "coordinates": {
                    "xCoordinate": 127.08083107,
                    "yCoordinate": 37.2644481
                },
                "articleCount": 4
            },
            {
                "clusterId": "16/55902/25449",
                "coordinates": {
                    "xCoordinate": 127.08032155,
                    "yCoordinate": 37.25928284
                },
                "articleCount": 4
            },
            {
                "clusterId": "16/55899/25450",
                "coordinates": {
                    "xCoordinate": 127.06470313,
                    "yCoordinate": 37.25237353
                },
                "articleCount": 3
            },
            {
                "clusterId": "16/55900/25450",
                "coordinates": {
                    "xCoordinate": 127.07229867,
                    "yCoordinate": 37.25334216
                },
                "articleCount": 2
            },
            {
                "clusterId": "16/55898/25451",
                "coordinates": {
                    "xCoordinate": 127.05921594,
                    "yCoordinate": 37.24785469
                },
                "articleCount": 1,
                "article": {
                    "articleNumber": "2628030378",
                    "realEstateType": "D02",
                    "tradeType": "A1",
                    "priceInfo": {
                        "dealPrice": 85000000,
                        "warrantyPrice": 0,
                        "rentPrice": 0,
                        "priceChangeStatus": 0
                    },
                    "spaceInfoDto": {
                        "supplySpace": 70.98,
                        "exclusiveSpace": 51.84,
                        "landSpace": 0,
                        "exclusiveSpaceName": "51"
                    },
                    "articleDetail": {
                        "residenceType": "1"
                    },
                    "articleMedia": {
                        "isVrExposed": false
                    }
                }
            },
            {
                "clusterId": "16/55899/25452",
                "coordinates": {
                    "xCoordinate": 127.06359423,
                    "yCoordinate": 37.24441329
                },
                "articleCount": 1,
                "article": {
                    "articleNumber": "2631017522",
                    "realEstateType": "D02",
                    "tradeType": "A1",
                    "priceInfo": {
                        "dealPrice": 330000000,
                        "warrantyPrice": 0,
                        "rentPrice": 0,
                        "priceChangeStatus": 0
                    },
                    "spaceInfoDto": {
                        "supplySpace": 40,
                        "exclusiveSpace": 32.85,
                        "landSpace": 0,
                        "exclusiveSpaceName": "32"
                    },
                    "articleDetail": {
                        "residenceType": "1"
                    },
                    "articleMedia": {
                        "isVrExposed": false
                    }
                }
            },
            {
                "clusterId": "16/55900/25451",
                "coordinates": {
                    "xCoordinate": 127.07100978,
                    "yCoordinate": 37.25207297
                },
                "articleCount": 1,
                "article": {
                    "articleNumber": "2632986044",
                    "realEstateType": "D02",
                    "tradeType": "A1",
                    "priceInfo": {
                        "dealPrice": 700000000,
                        "warrantyPrice": 0,
                        "rentPrice": 0,
                        "priceChangeStatus": 0
                    },
                    "spaceInfoDto": {
                        "supplySpace": 86.89,
                        "exclusiveSpace": 47.95,
                        "landSpace": 0,
                        "exclusiveSpaceName": "47"
                    },
                    "articleDetail": {
                        "residenceType": "1"
                    },
                    "articleMedia": {
                        "isVrExposed": false
                    }
                }
            }
        ]
    }
}
원안의 숫자 하위 매물
curl 'https://fin.land.naver.com/front-api/v1/article/clusteredArticles' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7' \
  -H 'baggage: sentry-environment=real,sentry-release=property-web%402026.06.17,sentry-public_key=ec5063b7741b4a9282a85c1e2f27ab09,sentry-trace_id=53f82be533584eba965a22c95784edad' \
  -H 'content-type: application/json' \
  -b 'NAC=l72SBERlv1OO; landHomeFlashUseYn=Y; nstore_session=KP5umJOEdYDd22w82d8B9xfW; map_snb_collapsed=false; PROP_TEST_KEY=1780374773932.9fe546bc4470b5965f30c4f93d1e2c77daafd3653744103b3465ce94bbc75f7d; PROP_TEST_ID=9791860f243b9cd506f4a7401059dcfbf0d8465db4f8df2e5559d2dabb62d4bd; nhn.realestate.article.rlet_type_cd=A01; nhn.realestate.article.trade_type_cd=""; nhn.realestate.article.ipaddress_city=4100000000; nid_inf=-1146586345; BUC=bgioqW42ACQh1F7dbMePCFWCOJr0MuHjVX2zM8X3D2I=' \
  -H 'origin: https://fin.land.naver.com' \
  -H 'priority: u=1, i' \
  -H 'referer: https://fin.land.naver.com/map?center=3zlqg9-2Az0Hd&zoom=14.106326324647169&showOnlySelectedRegion=true&tradeTypes=A1&realEstateTypes=D05-D02&hasArticleComplex=true&layer=NobwRAlgJmBcYEMBOAXCBjANgUwPqYgGcUwAaMQ7ZdACwAVkEBbQucFATwAds4wBhADIBVAMoAVAKIAlMmCwBXYtiQBJGPACMANgD0AVn0BOAAybdAJn0AWfSbABfBwF0gA' \
  -H 'sec-ch-ua: "Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'sentry-trace: 53f82be533584eba965a22c95784edad-81abe5e1a079e3f2' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36' \
  --data-raw '{"clusterId":"16/55901/25450","filter":{"tradeTypes":["A1"],"realEstateTypes":["D05","D02"],"roomCount":[],"bathRoomCount":[],"optionTypes":[],"oneRoomShapeTypes":[],"moveInTypes":[],"filtersExclusiveSpace":false,"floorTypes":[],"directionTypes":[],"hasArticlePhoto":false,"isAuthorizedByOwner":false,"parkingTypes":[],"entranceTypes":[],"hasArticle":true},"articlePagingRequest":{"size":30,"userChannelType":"PC","articleSortType":"RANKING_DESC","lastInfo":[]}}'

{
    "isSuccess": true,
    "detailCode": "success",
    "message": "",
    "result": {
        "seed": "fd24f4e5-f0c1-46c9-93ee-a8115c6efa41",
        "lastInfo": [
            1,
            740.3975323683384,
            "2630867410"
        ],
        "hasNextPage": true,
        "totalCount": 72,
        "list": [
            {
                "representativeArticleInfo": {
                    "articleNumber": "2633824750",
                    "articleName": "복합상가",
                    "buildingType": "D0204",
                    "tradeType": "A1",
                    "realEstateType": "D02",
                    "spaceInfo": {
                        "supplySpace": 100,
                        "exclusiveSpace": 54,
                        "landSpace": 0,
                        "floorSpace": 0,
                        "exclusiveSpaceName": "54"
                    },
                    "landInfo": {
                        "currentPurpose": "기타",
                        "recommendedPurpose": "소매점,판매점"
                    },
                    "buildingInfo": {
                        "buildingConjunctionDateType": "CDY01",
                        "buildingConjunctionDate": "20030808",
                        "approvalElapsedYear": 23
                    },
                    "verificationInfo": {
                        "verificationType": "MOBL",
                        "isAssociationArticle": false,
                        "exposureStartDate": "2026-06-23",
                        "articleConfirmDate": "2026-06-23"
                    },
                    "brokerInfo": {
                        "cpId": "SERVE",
                        "brokerageName": "영통역IPARK부동산중개사무소",
                        "brokerName": "부동산써브",
                        "cpOutLinkType": "CP_NAME"
                    },
                    "articleDetail": {
                        "direction": "WW",
                        "directionStandard": "주된 출입구 기준",
                        "articleFeatureDescription": "대로변1층,A급수익성상가,안정적수익율",
                        "directTrade": false,
                        "floorInfo": "1/10",
                        "floorDetailInfo": {
                            "targetFloor": "1",
                            "totalFloor": "10",
                            "groundTotalFloor": "0",
                            "undergroundTotalFloor": "0",
                            "floorType": "00",
                            "residenceType": "1"
                        },
                        "isSafeLessorOfHug": false
                    },
                    "articleMediaDto": {
                        "imageCount": 0,
                        "isVrExposed": false,
                        "photos": []
                    },
                    "articleMedia": {
                        "imageCount": 0,
                        "isVrExposed": false,
                        "photos": []
                    },
                    "address": {
                        "city": "경기도",
                        "division": "수원시 영통구",
                        "sector": "영통동",
                        "coordinates": {
                            "xCoordinate": 127.0750347,
                            "yCoordinate": 37.2544778
                        }
                    },
                    "priceInfo": {
                        "dealPrice": 890000000,
                        "warrantyPrice": 0,
                        "rentPrice": 0,
                        "managementFeeAmount": 150000,
                        "priceChangeStatus": 0
                    }
                }
            }, ....