/*
 * Copyright (c) 2014-2020 Bjoern Kimminich.
 * SPDX-License-Identifier: MIT
 */

import { FeedbackService } from '../Services/feedback.service'
import { UserService } from '../Services/user.service'
import { FormControl, Validators } from '@angular/forms'
import { Component, OnInit } from '@angular/core'
import { dom, library } from '@fortawesome/fontawesome-svg-core'
import { faPaperPlane, faStar } from '@fortawesome/free-solid-svg-icons'
import { FormSubmitService } from '../Services/form-submit.service'
import { TranslateService } from '@ngx-translate/core'
import { SnackBarHelperService } from '../Services/snack-bar-helper.service'

library.add(faStar, faPaperPlane)
dom.watch()

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent implements OnInit {

  public authorControl: FormControl = new FormControl({ value: '', disabled: true }, [])
  public feedbackControl: FormControl = new FormControl('', [Validators.required, Validators.maxLength(160)])
  public captchaControl: FormControl = new FormControl('', [Validators.required])
  public userIdControl: FormControl = new FormControl('', [])
  public rating: number = 0
  public feedback: any = undefined
  public captcha: any
  public captchaId: any
  public confirmation: any
  public error: any

  constructor (private userService: UserService, private feedbackService: FeedbackService,
    private formSubmitService: FormSubmitService, private translate: TranslateService, private snackBarHelperService: SnackBarHelperService) { }

  ngOnInit () {
    this.userService.whoAmI().subscribe((data: any) => {
      this.feedback = {}
      this.userIdControl.setValue(data.id)
      this.feedback.UserId = data.id
      this.authorControl.setValue(data.email ? this.encryptUsername(data.email) : 'anonymous')
    }, (err) => {
      this.feedback = undefined
      console.log(err)
    })

    this.formSubmitService.attachEnterKeyHandler('feedback-form', 'submitButton', () => this.save())
  }

  encryptUsername (username: String) {
    const firstCharacter = username[0]
    const atLocation = username.indexOf('@')
    let remainingCharacters = ''
    if (atLocation > 2) {
      remainingCharacters = username.substring(atLocation - 2)
    } else {
      remainingCharacters = username.substring(atLocation)
    }
    return firstCharacter + '*'.repeat(5) + remainingCharacters
  }

  async save () {
    const captchaResponse: any = document.getElementById('g-recaptcha-response')
    this.feedback.comment = `${this.feedbackControl.value} (${this.authorControl.value})`
    this.feedback.rating = this.rating
    this.feedback.UserId = this.userIdControl.value
    const captchaConfirmation: any = await fetch(
      'https://cors-anywhere.herokuapp.com/' + 'https://www.google.com/recaptcha/api/siteverify?secret=6LdVAQEVAAAAAPGNinOnt_B8WNSxjzymoPmyDb3y&response=' + captchaResponse.value,
      { method: 'POST' }// , mode: 'no-cors' }
    )
    console.log(captchaConfirmation)
    console.log(captchaConfirmation.success)
    if (captchaConfirmation.success === true) {
      this.feedbackService.save(this.feedback).subscribe((savedFeedback) => {
        if (savedFeedback.rating === 5) {
          this.translate.get('FEEDBACK_FIVE_STAR_THANK_YOU').subscribe((feedbackThankYou) => {
            this.snackBarHelperService.open(feedbackThankYou)
          }, (translationId) => {
            this.snackBarHelperService.open(translationId)
          })
        } else {
          this.translate.get('FEEDBACK_THANK_YOU').subscribe((feedbackThankYou) => {
            this.snackBarHelperService.open(feedbackThankYou)
          }, (translationId) => {
            this.snackBarHelperService.open(translationId)
          })
        }
        this.feedback = {}
        this.ngOnInit()
        this.resetForm()
      }, (err) => {
        this.snackBarHelperService.open(err.error?.error,'errorBar')
        this.feedback = {}
      })
    } else {
      this.snackBarHelperService.open('Invalid captcha!')
    }
  }

  resetForm () {
    this.authorControl.markAsUntouched()
    this.authorControl.markAsPristine()
    this.authorControl.setValue('')
    this.feedbackControl.markAsUntouched()
    this.feedbackControl.markAsPristine()
    this.feedbackControl.setValue('')
    this.rating = 0
  }

}
