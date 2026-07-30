import React from 'react';
import { X, Shield, Lock, FileText, CheckCircle } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAr: boolean;
}

export default function PrivacyPolicyModal({ isOpen, onClose, isAr }: PrivacyPolicyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#14332B]/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className="relative bg-white w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#E9E7E2] animate-in fade-in zoom-in duration-250"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E9E7E2] bg-[#F6F6F4] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF5A5F]/10 text-[#FF5A5F] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#14332B]">
                {isAr ? 'سياسة الخصوصية وسرية المعلومات – منصة CONFIRMED' : 'Privacy Policy & Confidentiality – CONFIRMED Platform'}
              </h3>
              <p className="text-xs text-[#6E6A63] mt-0.5">
                {isAr ? 'آخر تحديث: يوليو ٢٠٢٦' : 'Last updated: July 2026'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-[#6E6A63] hover:text-[#1C1B18] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-[#3E3A33] leading-relaxed font-sans max-h-[calc(85vh-140px)]">
          {isAr ? (
            // Arabic Content
            <div className="space-y-6">
              <div className="p-4 bg-[#FFF0F0]/50 rounded-2xl border border-[#FF5A5F]/10 flex gap-3">
                <Lock className="w-5 h-5 text-[#FF5A5F] shrink-0 mt-0.5" />
                <p className="text-xs text-[#5B21B6]">
                  يرحّب بكم فريق عمل منصة CONFIRMED، ونفيدكم بأنه حرصًا منّا على حماية المستخدمين، فإن منصة CONFIRMED تسعى للحفاظ على المعلومات الخاصة بمقدّمي الخدمات وعملائهم وفقًا لآلية سياسة الخصوصية وسرية المعلومات المعمول بها في منصة CONFIRMED.
                  <br />
                  وعليه فإن منصة CONFIRMED تنوّه بأن هذه الوثيقة تُحيطكم علمًا بسياسة الخصوصية وسرية المعلومات المعمول بها في منصة CONFIRMED. وقد أنشأت منصة CONFIRMED هذه السياسة لتوضيح وتحديد آلية السرية والخصوصية المعمول بها في منصة CONFIRMED، لذا يُرجى الاطلاع عليها، حيث إن استخدامكم لمنصة CONFIRMED يعني أن معلوماتكم تخضع لهذه السياسة.
                </p>
              </div>

              {/* Definitions */}
              <div>
                <h4 className="font-bold text-[#14332B] text-base mb-3 border-r-4 border-[#FF5A5F] pr-2">التعريفات الأساسية</h4>
                <div className="grid grid-cols-1 gap-3 mt-2">
                  <div className="p-3 bg-[#F6F6F4] rounded-xl">
                    <span className="font-bold text-[#FF5A5F] block mb-1">(CONFIRMED)</span>
                    <span className="text-xs text-[#6E6A63]">
                      يقصَد بهذه العبارة المنصة التي تقدم نظام تشغيل وإدارة للأعمال الخدمية (مثل: الصالونات، الأندية الرياضية، الأكاديميات، الخدمات المنزلية/المتنقلة وغيرها)، ويشمل هذا التعريف كافة أشكال منصة CONFIRMED في فضاء الإنترنت، سواء كان تطبيقًا أو موقعًا إلكترونيًا أو لوحة تحكم، بما في ذلك الخصائص المرتبطة بها مثل: إدارة المواعيد والحجوزات والاشتراكات والفواتير والتذكيرات عبر قنوات التواصل، وأي واجهات حجز أو مواقع أو تطبيقات "موسومة/مبيّضة العلامة" يتم تفعيلها للمنشأة.
                    </span>
                  </div>

                  <div className="p-3 bg-[#F6F6F4] rounded-xl">
                    <span className="font-bold text-[#FF5A5F] block mb-1">(مقدّم الخدمة / المنشأة)</span>
                    <span className="text-xs text-[#6E6A63]">
                      يقصَد بهذه العبارة كل منشأة أو فرد (شخص طبيعي أو معنوي) يسجّل في منصة CONFIRMED لاستخدام النظام في إدارة نشاطه الخدمي، بما يشمل حساباته وفروعه وخدماته وموظفيه وعملياته عبر منصة CONFIRMED.
                    </span>
                  </div>

                  <div className="p-3 bg-[#F6F6F4] rounded-xl">
                    <span className="font-bold text-[#FF5A5F] block mb-1">(العميل النهائي)</span>
                    <span className="text-xs text-[#6E6A63]">
                      يقصَد بهذه العبارة كل شخص يقوم بحجز موعد/خدمة أو الاشتراك أو الدفع أو التفاعل مع واجهة الحجز التابعة لمقدّم الخدمة (مثل صفحة الحجز، أو الموقع، أو التطبيق المبيّض).
                    </span>
                  </div>

                  <div className="p-3 bg-[#F6F6F4] rounded-xl">
                    <span className="font-bold text-[#FF5A5F] block mb-1">(الموظف/الممارس)</span>
                    <span className="text-xs text-[#6E6A63]">
                      يقصَد بهذه العبارة كل شخص يتم إضافته من قبل مقدّم الخدمة على منصة CONFIRMED (مثل: موظف استقبال، مدرب، أخصائي، فني، مقدم خدمة)، وتُمنح له صلاحيات وصول بحسب ما يحدده مقدّم الخدمة.
                    </span>
                  </div>

                  <div className="p-3 bg-[#F6F6F4] rounded-xl">
                    <span className="font-bold text-[#FF5A5F] block mb-1">(واجهة الحجز)</span>
                    <span className="text-xs text-[#6E6A63]">
                      يقصَد بهذه العبارة أي واجهة يتيحها مقدّم الخدمة لعملائه عبر CONFIRMED (صفحة حجز، موقع، تطبيق مبيّض، نموذج، رابط دفع… إلخ).
                    </span>
                  </div>

                  <div className="p-3 bg-[#F6F6F4] rounded-xl">
                    <span className="font-bold text-[#FF5A5F] block mb-1">(المستخدم)</span>
                    <span className="text-xs text-[#6E6A63]">
                      تُستخدم هذه العبارة للإشارة إلى أي شخص يستخدم منصة CONFIRMED، سواء كان مقدّم خدمة أو موظفًا/ممارسًا أو عميلًا نهائيًا.
                    </span>
                  </div>
                </div>
              </div>

              {/* CONFIRMED Role */}
              <div>
                <h4 className="font-bold text-[#14332B] text-base mb-2 border-r-4 border-[#FF5A5F] pr-2">طبيعة دور CONFIRMED في البيانات</h4>
                <ul className="list-disc list-inside space-y-2 pr-2 text-xs text-[#6E6A63] mt-2">
                  <li><strong className="text-[#1C1B18]">بيانات مقدّم الخدمة (مالك الحساب/المنشأة):</strong> غالبًا تكون منصة CONFIRMED "متحكمًا بالبيانات" فيما يخص بيانات إنشاء الحساب وإدارته وتشغيل المنصة.</li>
                  <li><strong className="text-[#1C1B18]">بيانات عملاء مقدّم الخدمة (العملاء النهائيون):</strong> غالبًا تكون منصة CONFIRMED "معالجًا للبيانات" لصالح مقدّم الخدمة فيما يتعلق ببيانات عملائه التي يُدخلها أو يجمعها عبر واجهات الحجز، بينما يبقى مقدّم الخدمة هو المسؤول الأساسي عن الغرض من جمع تلك البيانات واستخدامها ضمن نشاطه.</li>
                </ul>
              </div>

              {/* Collected Information */}
              <div>
                <h4 className="font-bold text-[#14332B] text-base mb-2 border-r-4 border-[#FF5A5F] pr-2">المعلومات التي تحصل عليها منصة CONFIRMED وتحتفظ بها في أنظمتها</h4>
                
                <div className="space-y-3 mt-3">
                  <div className="p-4 border border-[#E9E7E2] rounded-2xl">
                    <p className="font-bold text-xs text-[#1C1B18] mb-1">أولًا: بيانات مقدّم الخدمة (المنشأة/مالك الحساب)</p>
                    <p className="text-xs text-[#6E6A63] leading-relaxed">
                      قد تشمل على سبيل المثال لا الحصر: معلومات التعريف والتواصل (الاسم، رقم الجوال، البريد الإلكتروني)، معلومات التوثيق والامتثال (رقم الهوية/الإقامة، السجل التجاري/وثيقة العمل الحر، الرقم الضريبي، الفاتورة الضريبية)، معلومات الحساب البنكي والآيبان لتفعيل التسويات، وإعدادات الفروع والخدمات والأسعار وباقات الاشتراك وبيانات الموظفين وصلاحياتهم.
                    </p>
                  </div>

                  <div className="p-4 border border-[#E9E7E2] rounded-2xl">
                    <p className="font-bold text-xs text-[#1C1B18] mb-1">ثانيًا: بيانات العميل النهائي (عملاء مقدّم الخدمة)</p>
                    <p className="text-xs text-[#6E6A63] leading-relaxed">
                      قد تشمل على سبيل المثال لا الحصر: الاسم، رقم الجوال، البريد الإلكتروني، وبيانات الحجوزات والمواعيد والاشتراكات، وحالة الدفع والمبالغ والقرارات (مع مراعاة أن بيانات البطاقات الحساسة عادةً تتم معالجتها لدى مزود الدفع مباشرة وليس داخل CONFIRMED).
                    </p>
                  </div>

                  <div className="p-4 border border-[#E9E7E2] rounded-2xl">
                    <p className="font-bold text-xs text-[#1C1B18] mb-1">ثالثاً: بيانات تقنية واستخدامية</p>
                    <p className="text-xs text-[#6E6A63] leading-relaxed">
                      معلومات الدخول المشفرة ووسائل استعادة الحساب، سجلات النظام وعناوين الـ IP، نوع الجهاز، المتصفح، نظام التشغيل، وأوقات وتواريخ الدخول وسجلات الأخطاء، بالإضافة لملفات تعريف الارتباط (Cookies) لتحسين تجربة المستخدم الفعالة.
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Sharing */}
              <div>
                <h4 className="font-bold text-[#14332B] text-base mb-2 border-r-4 border-[#FF5A5F] pr-2">مشاركة المعلومات</h4>
                <p className="text-xs text-[#6E6A63] leading-relaxed pr-2">
                  بطبيعة الحال فإن منصة CONFIRMED تسعى للاحتفاظ بهذه المعلومات بما يحفظ خصوصية المستخدم، ولا تحتفظ بهذه المعلومات إلا بهدف تشغيل المنصة وتحسين جودتها وتقديم خدماتها وتسهيلها.
                  <br />
                  كقاعدة عامة: لا يطلع على البيانات إلا عدد محدود من القائمين على تشغيل المنصة ممن تتطلب أعمالهم ذلك وبصلاحيات محددة، ولا تُباع البيانات ولا تُؤجّر ولا تُشارك لأغراض تجارية خارج نطاق تقديم الخدمة وتجربة المستخدم الموحدة.
                </p>
              </div>

              {/* Security */}
              <div>
                <h4 className="font-bold text-[#14332B] text-base mb-2 border-r-4 border-[#FF5A5F] pr-2">سرية وأمان المعلومات</h4>
                <p className="text-xs text-[#6E6A63] leading-relaxed pr-2">
                  تسعى منصة CONFIRMED إلى الحفاظ على سرية معلومات المستخدمين من خلال تطبيق ضوابط أمنية وتقنية مناسبة لحماية البيانات وتحديث إجراءات الحماية بشكل دوري. ونظرًا لكون شبكة الإنترنت لا يمكن ضمانها بنسبة 100%، ننصح المستخدمين بالحفاظ على سرية بيانات الدخول وعدم مشاركتها واستخدم كلمات مرور قوية ومميزة وتحديثها دورياً.
                </p>
              </div>

              {/* Google API Data */}
              <div>
                <h4 className="font-bold text-[#14332B] text-base mb-2 border-r-4 border-[#FF5A5F] pr-2">استخدام بيانات واجهات برمجة تطبيقات جوجل (Google API)</h4>
                <p className="text-xs text-[#6E6A63] leading-relaxed pr-2">
                  تستخدم منصة CONFIRMED واجهات برمجة تطبيقات جوجل لتقديم خدمات تسجيل الدخول وبعض ميزات الإعلانات. عند ربط حسابك في جوجل، قد نتمكن من الوصول إلى بعض بياناتك الأساسية مثل الاسم والبريد الإلكتروني، بالإضافة إلى بيانات الإعلانات عند الحاجة.
                  <br />
                  نستخدم هذه البيانات فقط من أجل: تسجيل الدخول والتحقق من هوية المستخدم، إدارة حسابك داخل منصة CONFIRMED، وتشغيل ميزات الإعلانات مثل إنشاء الحملات ومتابعة أدائها. ونؤكد أننا لا نقوم ببيع أو مشاركة بيانات مستخدمي جوجل مع أي طرف ثالث.
                  <br />
                  يتم حفظ البيانات بشكل آمن، ونحتفظ بها فقط للمدة اللازمة لتقديم خدماتنا. كما يمكنك طلب حذف بياناتك في أي وقت عبر التواصل معنا على: <strong className="text-[#FF5A5F]">marktning@onfirmedmarketing.com</strong>. وتلتزم CONFIRMED باستخدام البيانات القادمة من جوجل وفقًا لسياسات جوجل الخاصة ببيانات المستخدمين، بما في ذلك متطلبات الاستخدام المحدود (Limited Use).
                </p>
              </div>

              {/* User Rights */}
              <div>
                <h4 className="font-bold text-[#14332B] text-base mb-2 border-r-4 border-[#FF5A5F] pr-2">حقوق المستخدمين فيما يتعلق بالبيانات الشخصية</h4>
                <ul className="list-disc list-inside space-y-2 pr-2 text-xs text-[#6E6A63]">
                  <li><strong className="text-[#1C1B18]">الحق في الوصول:</strong> الاطلاع على البيانات الشخصية التي تحتفظ بها المنصة.</li>
                  <li><strong className="text-[#1C1B18]">الحق في الحصول على نسخة:</strong> طلب نسخة من البيانات وذلك خلال سريان فترة الاشتراك الفعالة.</li>
                </ul>
              </div>

              {/* Support */}
              <div>
                <h4 className="font-bold text-[#14332B] text-base mb-2 border-r-4 border-[#FF5A5F] pr-2">التواصل بشأن الخصوصية</h4>
                <p className="text-xs text-[#6E6A63] leading-relaxed pr-2">
                  لمزيد من التفاصيل عن معالجة بياناتك الشخصية، وكيفية ممارسة حقوقك، يمكنك التواصل عبر قنوات التواصل الرسمية المعلنة داخل منصة CONFIRMED أو عبر قسم الدعم والبريد الإلكتروني المعتمد <strong className="text-[#FF5A5F]">marktning@onfirmedmarketing.com</strong>.
                </p>
              </div>
            </div>
          ) : (
            // English Content
            <div className="space-y-6">
              <div className="p-4 bg-[#FFF0F0]/50 rounded-2xl border border-[#FF5A5F]/10 flex gap-3">
                <Lock className="w-5 h-5 text-[#FF5A5F] shrink-0 mt-0.5" />
                <p className="text-xs text-[#5B21B6]">
                  The CONFIRMED Platform team welcomes you. Out of our utmost concern to protect our users, CONFIRMED strives to safeguard the confidential information of our service providers and their clients in accordance with our strict privacy policy guidelines.
                  <br />
                  Your usage of CONFIRMED services and platform features constitutes an acknowledgment and binding acceptance of these terms. We established this framework to define data processing operations transparently.
                </p>
              </div>

              {/* Definitions */}
              <div>
                <h4 className="font-bold text-[#14332B] text-base mb-3 border-l-4 border-[#FF5A5F] pl-2">Key Definitions</h4>
                <div className="grid grid-cols-1 gap-3 mt-2">
                  <div className="p-3 bg-[#F6F6F4] rounded-xl">
                    <span className="font-bold text-[#FF5A5F] block mb-1">CONFIRMED</span>
                    <span className="text-xs text-[#6E6A63]">
                      Refers to the platform offering a smart operating and business management software solution for salons, wellness centers, academies, and mobile services. This encompasses the dashboard, website, apps, client scheduling, e-invoices, and white-labeled booking solutions.
                    </span>
                  </div>

                  <div className="p-3 bg-[#F6F6F4] rounded-xl">
                    <span className="font-bold text-[#FF5A5F] block mb-1">Service Provider / Facility</span>
                    <span className="text-xs text-[#6E6A63]">
                      The legal business entity or self-employed practitioner who registers on CONFIRMED to automate their professional operations, manage schedules, staff members, and execute client-facing transactions.
                    </span>
                  </div>

                  <div className="p-3 bg-[#F6F6F4] rounded-xl">
                    <span className="font-bold text-[#FF5A5F] block mb-1">End Client</span>
                    <span className="text-xs text-[#6E6A63]">
                      The final consumer booking appointments, buying services, initiating electronic payments, or interacting with the service provider's customized portals or links.
                    </span>
                  </div>

                  <div className="p-3 bg-[#F6F6F4] rounded-xl">
                    <span className="font-bold text-[#FF5A5F] block mb-1">Employee / Practitioner</span>
                    <span className="text-xs text-[#6E6A63]">
                      Any service staff, stylist, therapist, or front-desk professional authorized under the service provider's account to receive bookings or manage store operations.
                    </span>
                  </div>
                </div>
              </div>

              {/* Roles */}
              <div>
                <h4 className="font-bold text-[#14332B] text-base mb-2 border-l-4 border-[#FF5A5F] pl-2">Data Processing Roles</h4>
                <ul className="list-disc list-inside space-y-2 pl-2 text-xs text-[#6E6A63] mt-2">
                  <li><strong className="text-[#1C1B18]">Service Provider Data:</strong> CONFIRMED acts as a <strong className="text-[#FF5A5F]">Data Controller</strong> for credentials and account registration information used to manage the contract.</li>
                  <li><strong className="text-[#1C1B18]">End Client Data:</strong> CONFIRMED acts purely as a <strong className="text-[#FF5A5F]">Data Processor</strong> on behalf of the Service Provider. The Service Provider is solely responsible for determining purposes of data gathering.</li>
                </ul>
              </div>

              {/* Data Collected */}
              <div>
                <h4 className="font-bold text-[#14332B] text-base mb-2 border-l-4 border-[#FF5A5F] pl-2">Information Collected and Stored</h4>
                <div className="space-y-3 mt-3">
                  <div className="p-4 border border-[#E9E7E2] rounded-2xl">
                    <p className="font-bold text-xs text-[#1C1B18] mb-1">1. Service Provider Business Details</p>
                    <p className="text-xs text-[#6E6A63]">
                      Names, contact details (phone, email), legal credentials (VAT IDs, commercial register/freelance documents), IBAN numbers for transaction settlement, staff registers, and scheduling settings.
                    </p>
                  </div>

                  <div className="p-4 border border-[#E9E7E2] rounded-2xl">
                    <p className="font-bold text-xs text-[#1C1B18] mb-1">2. End Client Details</p>
                    <p className="text-xs text-[#6E6A63]">
                      Contact profiles (name, phone, email), appointment history, package subscriptions, and e-billing references (sensitive cards are securely processed by our certified gateway partner directly, not stored inside CONFIRMED).
                    </p>
                  </div>

                  <div className="p-4 border border-[#E9E7E2] rounded-2xl">
                    <p className="font-bold text-xs text-[#1C1B18] mb-1">3. Automated Technical Metatags</p>
                    <p className="text-xs text-[#6E6A63]">
                      Encrypted logs, security tokens, IP addresses, browser specifications, OS types, entry timestamps, performance metrics, and cookies necessary for high-speed application caching.
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Sharing */}
              <div>
                <h4 className="font-bold text-[#14332B] text-base mb-2 border-l-4 border-[#FF5A5F] pl-2">Data Sharing Policy</h4>
                <p className="text-xs text-[#6E6A63] leading-relaxed pl-2">
                  CONFIRMED does not sell, trade, or lease user databases to third-party commercial brokers. Access is restricted to technical staff with strict administrative clearances solely for software maintenance, debugging, and service continuity.
                </p>
              </div>

              {/* Google API Usage */}
              <div>
                <h4 className="font-bold text-[#14332B] text-base mb-2 border-l-4 border-[#FF5A5F] pl-2">Google API Data Usage and Limited Use Policy</h4>
                <p className="text-xs text-[#6E6A63] leading-relaxed pl-2">
                  We use Google APIs for secure authentication and marketing features. We do not sell or lease Google user profiles to advertising platforms. Data is handled safely and can be deleted upon request sent directly to <strong className="text-[#FF5A5F]">marktning@onfirmedmarketing.com</strong>.
                  <br />
                  CONFIRMED adheres to the Google API Services User Data Policy, including the Limited Use requirements.
                </p>
              </div>

              {/* User Rights */}
              <div>
                <h4 className="font-bold text-[#14332B] text-base mb-2 border-l-4 border-[#FF5A5F] pl-2">User Privacy Rights</h4>
                <ul className="list-disc list-inside space-y-2 pl-2 text-xs text-[#6E6A63]">
                  <li><strong>Right to Access:</strong> Inspect data profiles securely preserved in the SaaS engine.</li>
                  <li><strong>Right to Copy:</strong> Export lists and operational spreadsheets during active subscription terms.</li>
                </ul>
              </div>

              {/* Contacts */}
              <div>
                <h4 className="font-bold text-[#14332B] text-base mb-2 border-l-4 border-[#FF5A5F] pl-2">Inquiries & Support</h4>
                <p className="text-xs text-[#6E6A63] leading-relaxed pl-2">
                  Should you have any questions or require custom data clearances, please message our support center or email us at <strong className="text-[#FF5A5F]">marktning@onfirmedmarketing.com</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[#E9E7E2] bg-[#F6F6F4] flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#FF5A5F] text-white text-xs font-bold hover:bg-[#FFAE34] transition-all cursor-pointer"
          >
            {isAr ? 'حسناً، فهمت' : 'Close Policy'}
          </button>
        </div>
      </div>
    </div>
  );
}
