import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, Trash2, FolderTree, HelpCircle } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { getTableDocuments } from '@/services/documentApi';
import { Z_INDEX } from '@/constants/zIndex';
import { Tooltip } from '@/components/ui/tooltip';

// SettingsPanel 내에서 사용하는 더미 데이터 테스트 패널
// 기존 documents/DummyDataTestPanel.jsx 내용을 이동
const DummyDataTestPanel = ({ workspaceId }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testResults, setTestResults] = useState(null);
  const [dataStatus, setDataStatus] = useState(null);
  const [tableDocs, setTableDocs] = useState([]);
  // 데이터 생성용 경로 상태
  const [dataSelectedPath, setDataSelectedPath] = useState('__root__');
  const [dataSelectedPathInfo, setDataSelectedPathInfo] = useState(null);
  

  // 관리자 권한 체크는 SettingsPanel 네비게이션 단계에서 수행하므로 여기서는 표시만 담당
  const [testConfig, setTestConfig] = useState({
    count: 10000,
    propertyCount: 5,
    dataType: 'realistic',
  });

  useEffect(() => {
    checkDataStatus();
  }, []);

  // 테이블 뷰 문서 목록 로드 (경로 선택용)
  useEffect(() => {
    async function fetchTableDocs() {
      if (!workspaceId) return;
      try {
        const tableDocs = await getTableDocuments(workspaceId);
        setTableDocs(Array.isArray(tableDocs) ? tableDocs : []);
      } catch (e) {
        console.error('테이블 문서 목록 로드 실패:', e);
        setTableDocs([]);
      }
    }
    fetchTableDocs();
  }, [workspaceId]);

  // 데이터 생성용 경로 정보 업데이트
  useEffect(() => {
    if (dataSelectedPath === '__root__') {
      setDataSelectedPathInfo({
        id: '__root__',
        title: '루트 경로',
        description: '워크스페이스의 최상위 레벨에 문서가 생성됩니다.'
      });
    } else {
      const selectedDoc = tableDocs.find(doc => String(doc.id) === dataSelectedPath);
      if (selectedDoc) {
        setDataSelectedPathInfo({
          id: selectedDoc.id,
          title: selectedDoc.title || `테이블 #${selectedDoc.id}`,
          description: '선택된 테이블의 자식 문서로 생성됩니다. 지정한 속성 개수만큼 부모 테이블에 속성을 추가하고, 자식 문서들이 이를 상속받습니다.'
        });
      }
    }
  }, [dataSelectedPath, tableDocs]);


  // 숫자 천 단위 콤마 포맷팅 함수
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const checkDataStatus = async () => {
    try {
      const response = await api.get('/api/dummy/status');
      setDataStatus(response.data);
    } catch (error) {
      console.error('데이터 상태 확인 실패:', error);
    }
  };

  const generateBulkData = async () => {
    setIsLoading(true);
    setProgress(0);
    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await api.post('/api/dummy/generate-bulk', null, {
        params: {
          count: testConfig.count,
          propertyCount: testConfig.propertyCount,
          dataType: testConfig.dataType,
          workspaceId: workspaceId,
          // 선택된 경로가 루트가 아니면 parentId 전달 (백엔드가 지원할 경우 사용)
          parentId: dataSelectedPath !== '__root__' ? dataSelectedPath : undefined,
        },
      });

      clearInterval(progressInterval);
      setProgress(100);
      setTestResults(response.data);
      await checkDataStatus();
      setTimeout(() => setProgress(0), 1000);
    } catch (error) {
      console.error('더미 데이터 생성 실패:', error);
      setTestResults({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };


  const clearDummyData = async () => {
    if (!confirm('모든 더미 데이터를 삭제하시겠습니까?')) return;
    setIsClearing(true);
    try {
      const response = await api.delete('/api/dummy/clear');
      setTestResults(response.data);
      await checkDataStatus();
    } catch (error) {
      console.error('더미 데이터 삭제 실패:', error);
      setTestResults({ success: false, error: error.message });
    } finally {
      setIsClearing(false);
    }
  };

  const optimizeDatabase = async () => {
    setIsOptimizing(true);
    try {
      const response = await api.post('/api/dummy/optimize');
      setTestResults(response.data);
    } catch (error) {
      console.error('데이터베이스 최적화 실패:', error);
      setTestResults({ success: false, error: error.message });
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5" />
          <span className="text-sm text-gray-600">전체 문서: {formatNumber(dataStatus?.documentCount || 0)}개</span>
          <span className="text-sm text-gray-600">/ 전체 속성: {formatNumber(dataStatus?.propertyCount || 0)}개</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>대량 데이터 생성</span>
          </CardTitle>
          <CardDescription>1만 개 이상의 더미 데이터를 빠르게 생성합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 데이터 경로 선택 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="dataPath" className="flex gap-2 items-center">
                <FolderTree className="w-4 h-4" /> 데이터 경로
              </Label>
                <Tooltip 
                  content="더미 데이터를 생성할 위치를 선택합니다. 루트 경로는 워크스페이스 최상위에, 특정 테이블 선택 시 해당 테이블의 자식 문서로 생성됩니다."
                  side="bottom"
                >
                  <HelpCircle className="w-4 h-4 text-blue-500 hover:text-blue-600 transition-colors duration-200" />
                </Tooltip>
            </div>
            <Select value={dataSelectedPath} onValueChange={(v) => setDataSelectedPath(v)}>
              <SelectTrigger id="dataPath" className="w-full">
                <SelectValue placeholder="루트 경로 (기본)" />
              </SelectTrigger>
              <SelectContent position="popper" className="overflow-auto max-h-72" style={{ zIndex: Z_INDEX.POPOVER }}>
                <SelectItem value="__root__">루트 경로 (기본)</SelectItem>
                {tableDocs.map((doc) => (
                  <SelectItem key={doc.id} value={String(doc.id)}>
                    {doc.title || `테이블 #${doc.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* 선택된 경로 정보 표시 */}
            {dataSelectedPathInfo && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">{dataSelectedPathInfo.title}</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">{dataSelectedPathInfo.description}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="count">데이터 개수</Label>
                <Tooltip 
                  content="생성할 더미 문서의 총 개수입니다. 1만 개 이상 권장하며, 테이블 뷰 가상화 성능 테스트에 적합합니다."
                  side="bottom"
                >
                  <HelpCircle className="w-4 h-4 text-blue-500 hover:text-blue-600 transition-colors duration-200" />
                </Tooltip>
              </div>
              <Input
                id="count"
                type="number"
                value={testConfig.count}
                onChange={(e) => setTestConfig((prev) => ({ ...prev, count: parseInt(e.target.value) }))}
                placeholder="10000"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="propertyCount">속성 개수</Label>
                <Tooltip 
                  content="각 문서에 생성할 속성의 개수입니다. 부모 문서 선택 시 이 개수만큼 부모에 속성을 추가하고 자식들이 상속받습니다."
                  side="bottom"
                >
                  <HelpCircle className="w-4 h-4 text-blue-500 hover:text-blue-600 transition-colors duration-200" />
                </Tooltip>
              </div>
              <Input
                id="propertyCount"
                type="number"
                value={testConfig.propertyCount}
                onChange={(e) => setTestConfig((prev) => ({ ...prev, propertyCount: parseInt(e.target.value) }))}
                placeholder="5"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="dataType">데이터 타입</Label>
              <Tooltip 
                content="생성할 더미 데이터의 유형을 선택합니다. 실제 데이터 시뮬레이션은 현실적인 내용, 스트레스 테스트용은 긴 텍스트, 랜덤 데이터는 UUID 기반입니다."
                side="bottom"
              >
                <HelpCircle className="w-4 h-4 text-blue-500 hover:text-blue-600 transition-colors duration-200" />
              </Tooltip>
            </div>
            <Select value={testConfig.dataType} onValueChange={(value) => setTestConfig((prev) => ({ ...prev, dataType: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ zIndex: Z_INDEX.POPOVER }}>
                <SelectItem value="realistic">실제 데이터 시뮬레이션 - 현실적인 제목과 내용</SelectItem>
                <SelectItem value="stress">스트레스 테스트용 - 긴 텍스트로 구성된 대용량 문서</SelectItem>
                <SelectItem value="random">랜덤 데이터 - UUID 기반의 고유한 랜덤 데이터</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={generateBulkData} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />데이터 생성 중...
              </>
            ) : (
              <>
                <Database className="mr-2 w-4 h-4" />대량 데이터 생성
              </>
            )}
          </Button>

          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>진행률</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>관리 도구</CardTitle>
          <CardDescription>데이터베이스 관리 및 최적화</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button onClick={optimizeDatabase} disabled={isOptimizing || isLoading} variant="outline" className="w-full">
                  {isOptimizing ? (
                    <>
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />최적화 중...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 w-4 h-4" />DB 최적화
                    </>
                  )}
                </Button>
                <Tooltip 
                  content="데이터베이스 성능을 최적화합니다. 인덱스 재구성, 통계 업데이트, 불필요한 데이터 정리 등을 수행하여 쿼리 성능을 향상시킵니다."
                  side="bottom"
                >
                  <HelpCircle className="w-4 h-4 text-blue-500 hover:text-blue-600 transition-colors duration-200" />
                </Tooltip>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button onClick={clearDummyData} disabled={isClearing || isLoading} variant="destructive" className="w-full">
                  {isClearing ? (
                    <>
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />삭제 중...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 w-4 h-4" />더미 데이터 삭제
                    </>
                  )}
                </Button>
                <Tooltip 
                  content="생성된 모든 더미 데이터를 삭제합니다. 문서, 속성, 속성 값 등 모든 관련 데이터가 영구적으로 제거됩니다. 실행 전 확인이 필요합니다."
                  side="bottom"
                >
                  <HelpCircle className="w-4 h-4 text-blue-500 hover:text-blue-600 transition-colors duration-200" />
                </Tooltip>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>테스트 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testResults.success ? (
                <div className="space-y-2">
                  <Badge variant="default" className="bg-green-500">성공</Badge>
                  {testResults.executionTime && <p className="text-sm">실행 시간: {formatNumber(testResults.executionTime)}ms</p>}
                  {testResults.documentCount && <p className="text-sm">생성된 문서: {formatNumber(testResults.documentCount)}개</p>}
                  {testResults.propertyCount && <p className="text-sm">생성된 속성: {formatNumber(testResults.propertyCount)}개</p>}
                  {testResults.inheritedProperties && testResults.inheritedProperties > 0 && (
                    <p className="text-sm text-blue-600">상속된 속성: {formatNumber(testResults.inheritedProperties)}개</p>
                  )}
                  {testResults.parentPropertiesAdded && testResults.parentPropertiesAdded > 0 && (
                    <p className="text-sm text-green-600">부모 문서에 추가된 속성: {formatNumber(testResults.parentPropertiesAdded)}개</p>
                  )}
                  {testResults.insertTime && <p className="text-sm">삽입 시간: {formatNumber(testResults.insertTime)}ms</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <Badge variant="destructive">실패</Badge>
                  <p className="text-sm text-red-600">{testResults.error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DummyDataTestPanel;